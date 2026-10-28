import type { FailInterruptedMeetingsUseCase } from '../ports/in/fail-interrupted-meetings.js';
import type { AudioStore } from '../ports/out/audio-store.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';

// El procesado corre dentro del proceso de api: si api se reinicia a mitad, esas reuniones
// se quedarían para siempre en "transcribiendo" o "resumiendo", y su audio temporal en el disco.
// Se ejecuta al arrancar. Las que ya tenían transcripción se pueden continuar (ResumeMeeting);
// la web explica qué hacer en cada caso.
export class FailInterruptedMeetings implements FailInterruptedMeetingsUseCase {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly audioStore: AudioStore,
  ) {}

  async execute(): Promise<number> {
    await this.audioStore.discardAll();
    return this.meetings.failUnfinished(
      'El procesamiento se interrumpió porque se reinició el servidor.',
    );
  }
}
