import type { Diagram } from '../../domain/diagram.js';
import type { Summary } from '../../domain/summary.js';
import type { TextGenerator } from '../ports/out/text-generator.js';
import { stripCodeFence } from './model-output.js';

const DIAGRAM_SYSTEM = `Recibes el resumen de una reunión en JSON y devuelves únicamente código Mermaid válido de tipo mindmap. Sin explicaciones ni bloques de código.
Reglas:
- La primera línea es exactamente: mindmap
- Un único nodo raíz con el tema principal, con la forma: root((Tema principal))
- Ramas para los temas, las decisiones y las tareas (con su responsable si lo hay).
- Sangría de 2 espacios por nivel y como mucho 4 niveles.
- Textos cortos (6 palabras como mucho) y sin paréntesis, corchetes, llaves, comillas ni dos puntos.`;

const FIX_SYSTEM = `Recibes código Mermaid de tipo mindmap que no es válido y el error que da al analizarlo. Devuelves únicamente el código corregido, sin explicaciones ni bloques de código. Mantén el contenido y cambia solo lo necesario para que sea válido.`;

export class DiagramGenerator {
  constructor(
    private readonly textGenerator: TextGenerator,
    private readonly model: string,
  ) {}

  async generate(summary: Summary, language: string): Promise<Diagram> {
    const { resumen, decisiones, tareas, temas } = summary;
    const code = await this.textGenerator.generate({
      model: this.model,
      system: DIAGRAM_SYSTEM,
      prompt: `Escribe los textos en el idioma del resumen (código: ${language}).\n\nResumen:\n${JSON.stringify({ resumen, decisiones, tareas, temas }, null, 2)}`,
    });
    return { type: 'mindmap', mermaidCode: stripCodeFence(code) };
  }

  async fix(mermaidCode: string, parseError: string): Promise<Diagram> {
    const code = await this.textGenerator.generate({
      model: this.model,
      system: FIX_SYSTEM,
      prompt: `Error:\n${parseError}\n\nCódigo:\n${mermaidCode}`,
    });
    return { type: 'mindmap', mermaidCode: stripCodeFence(code) };
  }
}
