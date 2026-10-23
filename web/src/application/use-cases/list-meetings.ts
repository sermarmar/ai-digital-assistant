import type { Meeting } from '../../domain/meeting';
import type { MeetingGateway } from '../ports/meeting-gateway';

export class ListMeetings {
  constructor(private readonly gateway: MeetingGateway) {}

  execute(): Promise<Meeting[]> {
    return this.gateway.list();
  }
}
