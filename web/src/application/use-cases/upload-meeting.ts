import type { Meeting } from '../../domain/meeting';
import type { MeetingGateway } from '../ports/meeting-gateway';

// Mismo límite que api (MAX_AUDIO_GB en api/src/infrastructure/in/http/server.ts)
export const MAX_UPLOAD_GB = 4;

// Sirve tanto para una grabación recién hecha como para un archivo de audio o vídeo que ya tengas
export class UploadMeeting {
  constructor(private readonly gateway: MeetingGateway) {}

  async execute(title: string, audio: Blob, filename: string): Promise<Meeting> {
    // Se comprueba antes de subir para no esperar a que llegue entero y api lo rechace
    if (audio.size > MAX_UPLOAD_GB * 1024 ** 3) {
      throw new Error(`El archivo pesa más de ${MAX_UPLOAD_GB} GB, que es el máximo.`);
    }
    return this.gateway.upload(title.trim(), audio, filename);
  }
}
