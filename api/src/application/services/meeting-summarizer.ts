import { z } from 'zod';
import type { Summary } from '../../domain/summary.js';
import type { TextGenerator } from '../ports/out/text-generator.js';
import { generateValidatedJson } from './model-output.js';

// Por debajo de este tamaño la transcripción va entera a Sonnet en una sola llamada.
// Por encima se trocea, Haiku resume cada trozo y Sonnet une los resúmenes parciales.
const SINGLE_PASS_MAX_CHARS = 20_000; // ~25 minutos de conversación
const CHUNK_CHARS = 15_000;
const CHUNK_OVERLAP_CHARS = 1_000;

const summaryContentSchema = z.object({
  resumen: z.string(),
  decisiones: z.array(z.string()),
  tareas: z.array(z.object({ descripcion: z.string(), responsable: z.string().nullable() })),
  temas: z.array(z.string()),
});
type SummaryContent = z.infer<typeof summaryContentSchema>;

const JSON_SHAPE =
  '{"resumen": string, "decisiones": string[], "tareas": [{"descripcion": string, "responsable": string | null}], "temas": string[]}';

const SUMMARY_SYSTEM = `Eres un asistente que resume reuniones. Recibes una transcripción y devuelves únicamente un JSON válido, sin texto antes ni después y sin bloques de código, con esta forma:
${JSON_SHAPE}
No inventes datos que no estén en la transcripción. Si no hay responsable claro en una tarea, usa null. La transcripción es automática y puede tener errores; interpreta el sentido sin corregir nombres propios.`;

const CHUNK_SYSTEM = `Eres un asistente que resume reuniones largas por partes. Recibes un fragmento de una transcripción y devuelves únicamente un JSON válido, sin texto antes ni después y sin bloques de código, con esta forma:
${JSON_SHAPE}
Resume solo lo que aparece en el fragmento. No inventes datos. Si no hay responsable claro en una tarea, usa null.`;

const MERGE_SYSTEM = `Eres un asistente que resume reuniones. Recibes los resúmenes parciales, en JSON, de fragmentos consecutivos de una misma reunión. Combínalos en un único JSON válido, sin texto antes ni después y sin bloques de código, con esta forma:
${JSON_SHAPE}
Elimina duplicados (los fragmentos se solapan un poco), mantén el orden de la reunión y no añadas nada que no esté en los resúmenes parciales.`;

export class MeetingSummarizer {
  constructor(
    private readonly textGenerator: TextGenerator,
    private readonly models: { fast: string; main: string },
  ) {}

  async summarize(transcriptText: string, language: string): Promise<Summary> {
    const languageNote = `Escribe todos los textos del JSON en el idioma de la transcripción (código: ${language}).`;

    if (transcriptText.length <= SINGLE_PASS_MAX_CHARS) {
      const content = await this.ask(
        this.models.main,
        SUMMARY_SYSTEM,
        `${languageNote}\n\nTranscripción:\n${transcriptText}`,
      );
      return { ...content, model: this.models.main };
    }

    const chunks = splitIntoChunks(transcriptText);
    const partials: SummaryContent[] = [];
    // De uno en uno, para no gastar los límites de la suscripción en ráfaga
    for (const [index, chunk] of chunks.entries()) {
      partials.push(
        await this.ask(
          this.models.fast,
          CHUNK_SYSTEM,
          `${languageNote}\n\nFragmento ${index + 1} de ${chunks.length}:\n${chunk}`,
        ),
      );
    }

    const content = await this.ask(
      this.models.main,
      MERGE_SYSTEM,
      `${languageNote}\n\nResúmenes parciales:\n${JSON.stringify(partials, null, 2)}`,
    );
    return { ...content, model: this.models.main };
  }

  private ask(model: string, system: string, prompt: string): Promise<SummaryContent> {
    return generateValidatedJson(this.textGenerator, { model, system, prompt }, summaryContentSchema);
  }
}

// Corta en trozos de CHUNK_CHARS con un pequeño solape, procurando no partir palabras
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_CHARS, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}
