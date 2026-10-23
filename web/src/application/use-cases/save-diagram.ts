import type { Diagram } from '../../domain/meeting';
import type { DiagramRenderer } from '../ports/diagram-renderer';
import type { MeetingGateway } from '../ports/meeting-gateway';

export class InvalidDiagramError extends Error {
  constructor(detail: string) {
    super(`El diagrama no es válido y no se ha guardado: ${detail}`);
    this.name = 'InvalidDiagramError';
  }
}

export class SaveDiagram {
  constructor(
    private readonly renderer: DiagramRenderer,
    private readonly gateway: MeetingGateway,
  ) {}

  async execute(meetingId: string, mermaidCode: string): Promise<Diagram> {
    const error = await this.renderer.validate(mermaidCode);
    if (error) throw new InvalidDiagramError(error);
    return this.gateway.saveDiagram(meetingId, mermaidCode);
  }
}
