import type { Meeting } from '../../domain/meeting';
import type { MeetingGateway } from '../ports/meeting-gateway';

// Sigue desde el resumen con Claude, sin volver a transcribir, una reunión que se quedó a medias
export class ResumeMeeting {
  constructor(private readonly gateway: MeetingGateway) {}

  execute(meetingId: string): Promise<Meeting> {
    return this.gateway.resume(meetingId);
  }
}
