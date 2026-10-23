import type { MeetingGateway } from '../ports/meeting-gateway';

export class DeleteMeeting {
  constructor(private readonly gateway: MeetingGateway) {}

  execute(meetingId: string): Promise<void> {
    return this.gateway.delete(meetingId);
  }
}
