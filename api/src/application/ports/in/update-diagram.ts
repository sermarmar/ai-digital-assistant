import type { Diagram } from '../../../domain/diagram.js';

export interface UpdateDiagramUseCase {
  /** Guarda el código Mermaid que ha editado el usuario. */
  execute(meetingId: string, mermaidCode: string): Promise<Diagram>;
}
