import type { Meeting } from '../../../domain/meeting.js';

export interface ListMeetingsUseCase {
  execute(): Promise<Meeting[]>;
}
