import type { AudioFile } from '../../../domain/audio-file.js';
import type { Meeting } from '../../../domain/meeting.js';

export interface ProcessMeetingInput {
  title?: string;
  audio: AudioFile;
}

export interface ProcessMeetingUseCase {
  /**
   * Crea la reunión y devuelve en cuanto está creada. Transcribir, resumir y generar el
   * diagrama sigue en segundo plano; el progreso se ve en el estado de la reunión.
   */
  execute(input: ProcessMeetingInput): Promise<Meeting>;
}
