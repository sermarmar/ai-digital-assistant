export interface DiagramRenderer {
  /** Devuelve el mensaje de error si el código Mermaid no es válido, o null si lo es. */
  validate(mermaidCode: string): Promise<string | null>;
  renderSvg(mermaidCode: string): Promise<string>;
  renderPng(mermaidCode: string): Promise<Blob>;
}
