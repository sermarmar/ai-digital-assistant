import { Agent, FormData, fetch } from 'undici';
import { z } from 'zod';
import {
  TranscriptionError,
  type Transcriber,
  type TranscriptionResult,
} from '../../../application/ports/out/transcriber.js';
import type { AudioFile } from '../../../domain/audio-file.js';

// Respuesta de POST /transcribe del servicio stt
const transcribeResponseSchema = z.object({
  text: z.string(),
  language: z.string(),
  durationSeconds: z.number(),
  segments: z.array(z.object({ startSeconds: z.number(), endSeconds: z.number(), text: z.string() })),
});
const errorResponseSchema = z.object({ error: z.string() });

export class SttTranscriber implements Transcriber {
  // Whisper en CPU puede tardar decenas de minutos con un audio largo, y el fetch de Node
  // corta a los 5 minutos sin respuesta. Este Agent quita ese límite solo para stt.
  private readonly dispatcher = new Agent({ headersTimeout: 0, bodyTimeout: 0 });

  constructor(private readonly baseUrl: string) {}

  async transcribe(audio: AudioFile): Promise<TranscriptionResult> {
    const form = new FormData();
    // content se lee del disco según se envía, sin cargar el archivo en memoria
    form.append('audio', audio.content, audio.filename);

    let response;
    try {
      response = await fetch(new URL('/transcribe', this.baseUrl), {
        method: 'POST',
        body: form,
        dispatcher: this.dispatcher,
        // Sin esto, fetch duplica el cuerpo por si tiene que repetirlo en una redirección, y esa
        // copia, que nadie lee, acaba guardando en memoria el archivo entero
        redirect: 'error',
        window: null,
      });
    } catch (error) {
      throw new TranscriptionError('No se ha podido conectar con el servicio de transcripción.', { cause: error });
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const sttError = errorResponseSchema.safeParse(body);
      throw new TranscriptionError(
        sttError.success
          ? sttError.data.error
          : `El servicio de transcripción ha respondido con el error ${response.status}.`,
      );
    }

    const data = transcribeResponseSchema.parse(body);
    return {
      transcript: { text: data.text, segments: data.segments },
      language: data.language,
      durationSeconds: data.durationSeconds,
    };
  }
}
