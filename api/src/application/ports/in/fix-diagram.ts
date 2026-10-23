import type { Diagram } from '../../../domain/diagram.js';

export interface FixDiagramUseCase {
  /** Pide a Claude que corrija un diagrama que no se puede dibujar y guarda el resultado. */
  execute(meetingId: string, mermaidCode: string, parseError: string): Promise<Diagram>;
}
