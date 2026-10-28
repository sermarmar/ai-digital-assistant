import { EmptyAudioError, NoSpeechDetectedError } from '../../domain/errors.js';
import type { AudioFile } from '../../domain/audio-file.js';
import type { Meeting } from '../../domain/meeting.js';
import type { ProcessMeetingInput, ProcessMeetingUseCase } from '../ports/in/process-meeting.js';
import type { AudioStore } from '../ports/out/audio-store.js';
import type { Logger } from '../ports/out/logger.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';
import type { Transcriber } from '../ports/out/transcriber.js';
import type { MeetingAnalyzer } from '../services/meeting-analyzer.js';

const DEFAULT_TITLE = 'Reunión sin título';

export class ProcessMeeting implements ProcessMeetingUseCase {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly audioStore: AudioStore,
    private readonly transcriber: Transcriber,
    private readonly analyzer: MeetingAnalyzer,
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
      // Con la transcripción guardada, si algo falla a partir de aquí se puede continuar (ResumeMeeting)
      await this.meetings.saveTranscript(meetingId, transcript);
      await this.meetings.update(meetingId, {
        status: 'resumiendo',
        language,
        durationSeconds: Math.round(durationSeconds),
      });

      await this.analyzer.analyze(meetingId, transcript.text, language, null);
    } catch (error) {
      await this.analyzer.markFailed(meetingId, error);
    }
  }

  // Si no se puede borrar, se borra al volver a arrancar api (FailInterruptedMeetings)
  private async discardAudio(audio: AudioFile): Promise<void> {
    await this.audioStore
      .discard(audio)
      .catch((error: unknown) => this.logger.error(`No se ha podido borrar el audio temporal ${audio.id}`, error));
  }
}
