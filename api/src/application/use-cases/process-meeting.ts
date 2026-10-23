import { NoSpeechDetectedError } from '../../domain/errors.js';
import type { AudioFile } from '../../domain/audio-file.js';
import type { Meeting } from '../../domain/meeting.js';
import { InvalidModelResponseError } from '../errors.js';
import type { ProcessMeetingInput, ProcessMeetingUseCase } from '../ports/in/process-meeting.js';
import type { Logger } from '../ports/out/logger.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';
import { TextGenerationError } from '../ports/out/text-generator.js';
import { TranscriptionError, type Transcriber } from '../ports/out/transcriber.js';
import type { DiagramGenerator } from '../services/diagram-generator.js';
import type { MeetingSummarizer } from '../services/meeting-summarizer.js';

const DEFAULT_TITLE = 'Reunión sin título';

export class ProcessMeeting implements ProcessMeetingUseCase {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly transcriber: Transcriber,
    private readonly summarizer: MeetingSummarizer,
    private readonly diagramGenerator: DiagramGenerator,
    private readonly logger: Logger,
  ) {}

  async execute({ title, audio }: ProcessMeetingInput): Promise<Meeting> {
    const meeting = await this.meetings.create(title?.trim() || DEFAULT_TITLE);
    // Sin await a propósito: la petición HTTP responde ya y el trabajo sigue en segundo plano
    void this.process(meeting.id, audio);
    return meeting;
  }

  private async process(meetingId: string, audio: AudioFile): Promise<void> {
    try {
      const { transcript, language, durationSeconds } = await this.transcriber.transcribe(audio);
      if (!transcript.text.trim()) throw new NoSpeechDetectedError();
      await this.meetings.saveTranscript(meetingId, transcript);
      await this.meetings.update(meetingId, {
        status: 'resumiendo',
        language,
        durationSeconds: Math.round(durationSeconds),
      });

      const summary = await this.summarizer.summarize(transcript.text, language);
      await this.meetings.saveSummary(meetingId, summary);

      // Si falla el diagrama, la reunión queda lista igualmente con el resumen y un aviso
      let warning: string | null = null;
      try {
        const diagram = await this.diagramGenerator.generate(summary, language);
        await this.meetings.saveDiagram(meetingId, diagram);
      } catch (error) {
        this.logger.error(`No se ha podido generar el diagrama de la reunión ${meetingId}`, error);
        warning = `No se ha podido generar el diagrama. ${toUserMessage(error)}`;
      }

      await this.meetings.update(meetingId, { status: 'listo', errorMessage: warning });
    } catch (error) {
      this.logger.error(`Error al procesar la reunión ${meetingId}`, error);
      await this.meetings
        .update(meetingId, { status: 'error', errorMessage: toUserMessage(error) })
        .catch((updateError: unknown) =>
          this.logger.error(`No se ha podido guardar el error de la reunión ${meetingId}`, updateError),
        );
    }
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
