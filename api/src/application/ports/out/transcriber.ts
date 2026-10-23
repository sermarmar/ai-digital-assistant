import type { AudioFile } from '../../../domain/audio-file.js';
import type { Transcript } from '../../../domain/transcript.js';

export interface TranscriptionResult {
  transcript: Transcript;
  /** Idioma detectado o forzado, como código ISO (por ejemplo "es"). */
  language: string;
  durationSeconds: number;
}

export interface Transcriber {
  transcribe(audio: AudioFile): Promise<TranscriptionResult>;
}

export class TranscriptionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TranscriptionError';
  }
}
