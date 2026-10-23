import type { Diagram } from '../../domain/diagram.js';
import { MeetingNotFoundError } from '../../domain/errors.js';
import type { UpdateDiagramUseCase } from '../ports/in/update-diagram.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';

export class UpdateDiagram implements UpdateDiagramUseCase {
  constructor(private readonly meetings: MeetingRepository) {}

  async execute(meetingId: string, mermaidCode: string): Promise<Diagram> {
    const meeting = await this.meetings.findDetailById(meetingId);
    if (!meeting) throw new MeetingNotFoundError(meetingId);

    const diagram: Diagram = { type: meeting.diagram?.type ?? 'mindmap', mermaidCode };
    await this.meetings.saveDiagram(meetingId, diagram);
    return diagram;
  }
}
