import type { Meeting } from '../../domain/meeting.js';
import type { ListMeetingsUseCase } from '../ports/in/list-meetings.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';

export class ListMeetings implements ListMeetingsUseCase {
  constructor(private readonly meetings: MeetingRepository) {}

  execute(): Promise<Meeting[]> {
    return this.meetings.findAll();
  }
}
