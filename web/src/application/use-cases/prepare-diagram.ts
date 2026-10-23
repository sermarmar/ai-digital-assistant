import type { DiagramRenderer } from '../ports/diagram-renderer';
import type { MeetingGateway } from '../ports/meeting-gateway';

const MAX_FIX_ATTEMPTS = 2;

export type PreparedDiagram =
  | { ok: true; mermaidCode: string; svg: string }
  | { ok: false; mermaidCode: string; error: string };

// Valida el diagrama guardado. Si Mermaid no lo entiende, envía a Claude el código y el error
// para que lo corrija, como mucho dos veces. Si aun así falla, se muestra el resumen sin diagrama.
export class PrepareDiagram {
  constructor(
    private readonly renderer: DiagramRenderer,
    private readonly gateway: MeetingGateway,
  ) {}

  /** Con `signal` cancelado no se piden más correcciones (cada una gasta una llamada a Claude). */
  async execute(meetingId: string, mermaidCode: string, signal?: AbortSignal): Promise<PreparedDiagram> {
    let code = mermaidCode;
    for (let attempt = 0; ; attempt++) {
      const error = await this.renderer.validate(code);
      if (!error) return { ok: true, mermaidCode: code, svg: await this.renderer.renderSvg(code) };
      if (attempt === MAX_FIX_ATTEMPTS || signal?.aborted) return { ok: false, mermaidCode: code, error };

      try {
        code = (await this.gateway.fixDiagram(meetingId, code, error)).mermaidCode;
      } catch (fixError) {
        const reason = fixError instanceof Error ? fixError.message : String(fixError);
        return { ok: false, mermaidCode: code, error: `${error}\n\nNo se ha podido corregir: ${reason}` };
      }
    }
  }
}
