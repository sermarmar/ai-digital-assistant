// Raíz de composición: el único sitio que conoce todas las piezas y las conecta.
import type { TextGenerator } from './application/ports/out/text-generator.js';
import { DiagramGenerator } from './application/services/diagram-generator.js';
import { MeetingSummarizer } from './application/services/meeting-summarizer.js';
import { CheckHealth } from './application/use-cases/check-health.js';
import { DeleteMeeting } from './application/use-cases/delete-meeting.js';
import { FailInterruptedMeetings } from './application/use-cases/fail-interrupted-meetings.js';
import { FixDiagram } from './application/use-cases/fix-diagram.js';
import { GetMeeting } from './application/use-cases/get-meeting.js';
import { ListMeetings } from './application/use-cases/list-meetings.js';
import { ProcessMeeting } from './application/use-cases/process-meeting.js';
import { UpdateDiagram } from './application/use-cases/update-diagram.js';
import { loadEnv, type Env } from './config/env.js';
import { buildHttpServer } from './infrastructure/in/http/server.js';
import { ApiTextGenerator } from './infrastructure/out/claude/api-text-generator.js';
import { SubscriptionTextGenerator } from './infrastructure/out/claude/subscription-text-generator.js';
import { ConsoleLogger } from './infrastructure/out/logging/console-logger.js';
import { createDatabase } from './infrastructure/out/postgres/database.js';
import { runMigrations } from './infrastructure/out/postgres/migrate.js';
import { PostgresDatabaseProbe } from './infrastructure/out/postgres/postgres-database-probe.js';
import { PostgresMeetingRepository } from './infrastructure/out/postgres/postgres-meeting-repository.js';
import { SttTranscriber } from './infrastructure/out/stt/stt-transcriber.js';

const env = loadEnv();

// 1. Adaptadores de salida
const database = createDatabase(env.DATABASE_URL);
await runMigrations(database.db);
const meetingRepository = new PostgresMeetingRepository(database.db);
const databaseProbe = new PostgresDatabaseProbe(database.db);
const transcriber = new SttTranscriber(env.STT_URL);
const textGenerator = createTextGenerator(env);
const logger = new ConsoleLogger();

// 2. Servicios de aplicación y casos de uso, que reciben los adaptadores a través de sus puertos
const summarizer = new MeetingSummarizer(textGenerator, { fast: env.MODEL_FAST, main: env.MODEL_MAIN });
const diagramGenerator = new DiagramGenerator(textGenerator, env.MODEL_MAIN);

const useCases = {
  checkHealth: new CheckHealth(databaseProbe),
  listMeetings: new ListMeetings(meetingRepository),
  getMeeting: new GetMeeting(meetingRepository),
  deleteMeeting: new DeleteMeeting(meetingRepository),
  processMeeting: new ProcessMeeting(meetingRepository, transcriber, summarizer, diagramGenerator, logger),
  fixDiagram: new FixDiagram(meetingRepository, diagramGenerator),
  updateDiagram: new UpdateDiagram(meetingRepository),
};

// 3. Adaptador de entrada
const server = buildHttpServer(useCases);

const interrupted = await new FailInterruptedMeetings(meetingRepository).execute();
if (interrupted > 0) server.log.warn(`${interrupted} reunión(es) a medio procesar marcadas como error`);
server.log.info(`Proveedor de Claude: ${env.CLAUDE_PROVIDER}`);

await server.listen({ host: '0.0.0.0', port: env.API_PORT });

function createTextGenerator({ CLAUDE_PROVIDER, ANTHROPIC_API_KEY }: Env): TextGenerator {
  if (CLAUDE_PROVIDER === 'subscription') return new SubscriptionTextGenerator();
  if (!ANTHROPIC_API_KEY) throw new Error('CLAUDE_PROVIDER=api necesita ANTHROPIC_API_KEY en el .env');
  return new ApiTextGenerator(ANTHROPIC_API_KEY);
}

async function shutdown(): Promise<void> {
  await server.close();
  await database.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
