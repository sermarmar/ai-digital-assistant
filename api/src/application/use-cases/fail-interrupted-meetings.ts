import type { FailInterruptedMeetingsUseCase } from '../ports/in/fail-interrupted-meetings.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';

// El procesado corre dentro del proceso de api: si api se reinicia a mitad, esas reuniones
// se quedarían para siempre en "transcribiendo" o "resumiendo". Se ejecuta al arrancar.
export class FailInterruptedMeetings implements FailInterruptedMeetingsUseCase {
  constructor(private readonly meetings: MeetingRepository) {}

  execute(): Promise<number> {
    return this.meetings.failUnfinished(
      'El procesamiento se interrumpió porque se reinició el servidor. Vuelve a subir el audio.',
    );
  }
}
