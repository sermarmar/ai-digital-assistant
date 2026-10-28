import { EmptyAudioError, NoSpeechDetectedError } from '../../domain/errors.js';
import type { AudioFile } from '../../domain/audio-file.js';
import type { Meeting } from '../../domain/meeting.js';
import { InvalidModelResponseError } from '../errors.js';
import type { ProcessMeetingInput, ProcessMeetingUseCase } from '../ports/in/process-meeting.js';
import type { AudioStore } from '../ports/out/audio-store.js';
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
    private readonly audioStore: AudioStore,
    private readonly transcriber: Transcriber,
    private readonly summarizer: MeetingSummarizer,
    private readonly diagramGenerator: DiagramGenerator,
    private readonly logger: Logger,
  ) {}

  async execute({ title, audio: upload }: ProcessMeetingInput): Promise<Meeting> {
    // Se guarda antes de crear la reunión: si la subida falla, no queda una reunión a medias
    const audio = await this.audioStore.save(upload);
    if (audio.content.size === 0) {
      await this.discardAudio(audio);
      throw new EmptyAudioError();
    }

    const meeting = await this.meetings.create(title?.trim() || DEFAULT_TITLE).catch(async (error: unknown) => {
      await this.discardAudio(audio);
      throw error;
    });
    // Sin await a propósito: la petición HTTP responde ya y el trabajo sigue en segundo plano
    void this.process(meeting.id, audio);
    return meeting;
  }

  private async process(meetingId: string, audio: AudioFile): Promise<void> {
    try {
      // El audio solo hace falta para transcribir: se borra en cuanto acaba, vaya bien o mal
      const { transcript, language, durationSeconds } = await this.transcriber
        .transcribe(audio)
        .finally(() => this.discardAudio(audio));
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

  // Si no se puede borrar, se borra al volver a arrancar api (FailInterruptedMeetings)
  private async discardAudio(audio: AudioFile): Promise<void> {
    await this.audioStore
      .discard(audio)
      .catch((error: unknown) => this.logger.error(`No se ha podido borrar el audio temporal ${audio.id}`, error));
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
