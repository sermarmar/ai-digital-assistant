import type { AudioFile, AudioUpload } from '../../../domain/audio-file.js';

// Guarda el audio subido solo mientras hace falta para transcribirlo
export interface AudioStore {
  save(upload: AudioUpload): Promise<AudioFile>;
  discard(audio: AudioFile): Promise<void>;
  /** Borra lo que quedase de una subida o transcripción interrumpida al pararse api. */
  discardAll(): Promise<void>;
}
