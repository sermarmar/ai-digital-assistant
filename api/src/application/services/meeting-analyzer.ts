import { NoSpeechDetectedError } from '../../domain/errors.js';
import type { Summary } from '../../domain/summary.js';
import { InvalidModelResponseError } from '../errors.js';
import type { Logger } from '../ports/out/logger.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';
import { TextGenerationError } from '../ports/out/text-generator.js';
import { TranscriptionError } from '../ports/out/transcriber.js';
import type { DiagramGenerator } from './diagram-generator.js';
import type { MeetingSummarizer } from './meeting-summarizer.js';

// La parte del procesado que va después de Whisper: resumen, diagrama y estado "listo".
// La usan ProcessMeeting, justo después de transcribir, y ResumeMeeting, para seguir con
// una reunión que se quedó a medias sin volver a transcribir.
export class MeetingAnalyzer {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly summarizer: MeetingSummarizer,
    private readonly diagramGenerator: DiagramGenerator,
    private readonly logger: Logger,
  ) {}

  /**
   * Resume la transcripción (salvo que ya haya resumen), genera el diagrama y deja la reunión lista.
   * Si falla el resumen, lanza el error; si falla el diagrama, la reunión queda lista con un aviso.
   */
  async analyze(meetingId: string, transcriptText: string, language: string, summary: Summary | null): Promise<void> {
    if (!summary) {
      summary = await this.summarizer.summarize(transcriptText, language);
      await this.meetings.saveSummary(meetingId, summary);
    }

    let warning: string | null = null;
    try {
      const diagram = await this.diagramGenerator.generate(summary, language);
      await this.meetings.saveDiagram(meetingId, diagram);
    } catch (error) {
      this.logger.error(`No se ha podido generar el diagrama de la reunión ${meetingId}`, error);
      warning = `No se ha podido generar el diagrama. ${toUserMessage(error)}`;
    }

    await this.meetings.update(meetingId, { status: 'listo', errorMessage: warning });
  }

  /** Pasa la reunión a "error" con un mensaje para el usuario. No lanza nunca: se llama desde segundo plano. */
  async markFailed(meetingId: string, error: unknown): Promise<void> {
    this.logger.error(`Error al procesar la reunión ${meetingId}`, error);
    await this.meetings
      .update(meetingId, { status: 'error', errorMessage: toUserMessage(error) })
      .catch((updateError: unknown) =>
        this.logger.error(`No se ha podido guardar el error de la reunión ${meetingId}`, updateError),
      );
  }
}

// Solo los errores conocidos llevan un mensaje pensado para enseñarlo al usuario
function toUserMessage(error: unknown): string {
  const known =
    error instanceof TranscriptionError ||
    error instanceof TextGenerationError ||
    error instanceof InvalidModelResponseError ||
    error instanceof NoSpeechDetectedError;
  return known ? error.message : 'Ha ocurrido un error inesperado al procesar la reunión.';
}
