import type { DiagramRenderer } from '../ports/diagram-renderer';

export type RenderedDiagram = { ok: true; svg: string } | { ok: false; error: string };

// Para la vista previa mientras el usuario edita: valida y dibuja, sin pedir correcciones a Claude
export class RenderDiagram {
  constructor(private readonly renderer: DiagramRenderer) {}

  async execute(mermaidCode: string): Promise<RenderedDiagram> {
    const error = await this.renderer.validate(mermaidCode);
    if (error) return { ok: false, error };
    return { ok: true, svg: await this.renderer.renderSvg(mermaidCode) };
  }
}
