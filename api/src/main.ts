// Raíz de composición: el único sitio que conoce todas las piezas y las conecta.
import { CheckHealth } from './application/use-cases/check-health.js';
import { DeleteMeeting } from './application/use-cases/delete-meeting.js';
import { GetMeeting } from './application/use-cases/get-meeting.js';
import { ListMeetings } from './application/use-cases/list-meetings.js';
import { loadEnv } from './config/env.js';
import { buildHttpServer } from './infrastructure/in/http/server.js';
import { createDatabase } from './infrastructure/out/postgres/database.js';
import { runMigrations } from './infrastructure/out/postgres/migrate.js';
import { PostgresDatabaseProbe } from './infrastructure/out/postgres/postgres-database-probe.js';
import { PostgresMeetingRepository } from './infrastructure/out/postgres/postgres-meeting-repository.js';

const env = loadEnv();

// 1. Adaptadores de salida
const database = createDatabase(env.DATABASE_URL);
await runMigrations(database.db);
const meetingRepository = new PostgresMeetingRepository(database.db);
const databaseProbe = new PostgresDatabaseProbe(database.db);

// 2. Casos de uso, que reciben los adaptadores a través de sus puertos
const useCases = {
  checkHealth: new CheckHealth(databaseProbe),
  listMeetings: new ListMeetings(meetingRepository),
  getMeeting: new GetMeeting(meetingRepository),
  deleteMeeting: new DeleteMeeting(meetingRepository),
};

// 3. Adaptador de entrada
const server = buildHttpServer(useCases);
await server.listen({ host: '0.0.0.0', port: env.API_PORT });

async function shutdown(): Promise<void> {
  await server.close();
  await database.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
