import type { Mermaid } from 'mermaid';
import type { DiagramRenderer } from '../application/ports/diagram-renderer';

const PNG_SCALE = 2;

// mermaid pesa bastante: se carga la primera vez que hace falta, no al abrir la app
let mermaidLoading: Promise<Mermaid> | null = null;
function loadMermaid(): Promise<Mermaid> {
  mermaidLoading ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
      // Etiquetas como texto SVG y no como HTML: con HTML no se puede pasar a PNG
      htmlLabels: false,
    });
    return mermaid;
  });
  return mermaidLoading;
}

let renderCount = 0;

export class MermaidDiagramRenderer implements DiagramRenderer {
  async validate(mermaidCode: string): Promise<string | null> {
    const mermaid = await loadMermaid();
    try {
      await mermaid.parse(mermaidCode);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  async renderSvg(mermaidCode: string): Promise<string> {
    const mermaid = await loadMermaid();
    renderCount += 1;
    const { svg } = await mermaid.render(`diagrama-${renderCount}`, mermaidCode);
    return svg;
  }

  // Dibuja el SVG en un canvas a doble resolución y lo exporta como PNG con fondo blanco
  async renderPng(mermaidCode: string): Promise<Blob> {
    const svgElement = new DOMParser().parseFromString(await this.renderSvg(mermaidCode), 'image/svg+xml')
      .documentElement;
    const [, , width = 800, height = 600] = (svgElement.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    svgElement.setAttribute('width', String(width));
    svgElement.setAttribute('height', String(height));

    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svgElement)], { type: 'image/svg+xml' }),
    );
    try {
      const image = new Image();
      image.src = url;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * PNG_SCALE);
      canvas.height = Math.ceil(height * PNG_SCALE);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('El navegador no permite dibujar en canvas');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se ha podido crear el PNG'))), 'image/png'),
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
