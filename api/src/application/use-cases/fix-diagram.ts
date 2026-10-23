import { MeetingNotFoundError } from '../../domain/errors.js';
import type { Diagram } from '../../domain/diagram.js';
import type { FixDiagramUseCase } from '../ports/in/fix-diagram.js';
import type { MeetingRepository } from '../ports/out/meeting-repository.js';
import type { DiagramGenerator } from '../services/diagram-generator.js';

export class FixDiagram implements FixDiagramUseCase {
  constructor(
    private readonly meetings: MeetingRepository,
    private readonly diagramGenerator: DiagramGenerator,
  ) {}

  async execute(meetingId: string, mermaidCode: string, parseError: string): Promise<Diagram> {
    const meeting = await this.meetings.findDetailById(meetingId);
    if (!meeting) throw new MeetingNotFoundError(meetingId);

    const diagram = await this.diagramGenerator.fix(mermaidCode, parseError);
    await this.meetings.saveDiagram(meetingId, diagram);
    return diagram;
  }
}
