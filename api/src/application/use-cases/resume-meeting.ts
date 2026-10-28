import { MeetingNotFoundError, MeetingNotResumableError } from '../../domain/errors.js';
import { canResume, type Meeting } from '../../domain/meeting.js';
import type { ResumeMeetingUseCase } from '../ports/in/resume-meeting.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';
import type { MeetingAnalyzer } from '../services/meeting-analyzer.js';

export class ResumeMeeting implements ResumeMeetingUseCase {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly analyzer: MeetingAnalyzer,
  ) {}

  async execute(meetingId: string): Promise<Meeting> {
    const meeting = await this.meetings.findDetailById(meetingId);
    if (!meeting) throw new MeetingNotFoundError(meetingId);
    if (!canResume(meeting)) throw new MeetingNotResumableError();

    await this.meetings.update(meetingId, { status: 'resumiendo', errorMessage: null });
    // Sin await a propósito, igual que en ProcessMeeting: la petición HTTP responde ya.
    // Si ya hay resumen (solo faltaba el diagrama), no se vuelve a pedir a Claude.
    void this.analyzer
      .analyze(meetingId, meeting.transcript.text, meeting.language, meeting.summary)
      .catch((error: unknown) => this.analyzer.markFailed(meetingId, error));

    const { transcript, summary, diagram, ...rest } = meeting;
    return { ...rest, status: 'resumiendo', errorMessage: null };
  }
}
