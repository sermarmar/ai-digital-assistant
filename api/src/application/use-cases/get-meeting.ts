import { MeetingNotFoundError } from '../../domain/errors.js';
import type { MeetingDetail } from '../../domain/meeting.js';
import type { GetMeetingUseCase } from '../ports/in/get-meeting.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';

export class GetMeeting implements GetMeetingUseCase {
  constructor(private readonly meetings: MeetingRepository) {}

  async execute(meetingId: string): Promise<MeetingDetail> {
    const meeting = await this.meetings.findDetailById(meetingId);
    if (!meeting) throw new MeetingNotFoundError(meetingId);
    return meeting;
  }
}
