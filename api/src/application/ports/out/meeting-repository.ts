import type { Meeting, MeetingDetail } from '../../../domain/meeting.js';

export interface MeetingRepository {
  /** Reuniones ordenadas de la más reciente a la más antigua. */
  findAll(): Promise<Meeting[]>;
  findDetailById(meetingId: string): Promise<MeetingDetail | null>;
  /** Devuelve false si no existía. */
  deleteById(meetingId: string): Promise<boolean>;
}
