import type { Meeting } from '../../../domain/meeting.js';

export interface ResumeMeetingUseCase {
  /**
   * Sigue con una reunión que se quedó a medias después de transcribir (ver canResume), sin
   * volver a pasar por Whisper. Devuelve en cuanto la reunión pasa a "resumiendo"; el resumen
   * y el diagrama siguen en segundo plano, como al subir el audio.
   * Lanza MeetingNotFoundError si no existe y MeetingNotResumableError si no se puede continuar.
   */
  execute(meetingId: string): Promise<Meeting>;
}
