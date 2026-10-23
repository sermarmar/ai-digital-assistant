import { MeetingNotFoundError } from '../../domain/errors.js';
import type { DeleteMeetingUseCase } from '../ports/in/delete-meeting.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';

export class DeleteMeeting implements DeleteMeetingUseCase {
  constructor(private readonly meetings: MeetingRepository) {}

  async execute(meetingId: string): Promise<void> {
    const deleted = await this.meetings.deleteById(meetingId);
    if (!deleted) throw new MeetingNotFoundError(meetingId);
  }
}
