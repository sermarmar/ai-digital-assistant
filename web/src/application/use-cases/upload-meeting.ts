import type { Meeting } from '../../domain/meeting';
import type { MeetingGateway } from '../ports/meeting-gateway';

// Sirve tanto para una grabación recién hecha como para un archivo de audio que ya tengas
export class UploadMeeting {
  constructor(private readonly gateway: MeetingGateway) {}

  execute(title: string, audio: Blob, filename: string): Promise<Meeting> {
    return this.gateway.upload(title.trim(), audio, filename);
  }
}
