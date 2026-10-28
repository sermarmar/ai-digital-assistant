import type { AudioUpload } from '../../../domain/audio-file.js';
import type { Meeting } from '../../../domain/meeting.js';

export interface ProcessMeetingInput {
  title?: string;
  audio: AudioUpload;
}

export interface ProcessMeetingUseCase {
  /**
   * Guarda el audio, crea la reunión y devuelve en cuanto está creada. Transcribir, resumir y
   * generar el diagrama sigue en segundo plano; el progreso se ve en el estado de la reunión.
   * Lanza EmptyAudioError si el archivo está vacío.
   */
  execute(input: ProcessMeetingInput): Promise<Meeting>;
}
