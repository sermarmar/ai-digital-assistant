import type { MeetingDetail } from '../../../domain/meeting.js';

export interface GetMeetingUseCase {
  /** Lanza MeetingNotFoundError si no existe. */
  execute(meetingId: string): Promise<MeetingDetail>;
}
