import type { MeetingDetail } from '../../domain/meeting';
import type { MeetingGateway } from '../ports/meeting-gateway';

export class GetMeeting {
  constructor(private readonly gateway: MeetingGateway) {}

  execute(meetingId: string): Promise<MeetingDetail> {
    return this.gateway.get(meetingId);
  }
}
