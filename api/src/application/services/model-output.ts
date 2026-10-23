import { z } from 'zod';
import { InvalidModelResponseError } from '../errors.js';
import type { TextGenerationRequest, TextGenerator } from '../ports/out/text-generator.js';

// Quita el bloque ```...``` si Claude envuelve la respuesta en uno aunque se le pida que no
export function stripCodeFence(text: string): string {
  const match = text.trim().match(/^```[\w-]*\n([\s\S]*?)\n?```$/);
  return (match?.[1] ?? text).trim();
}

// Pide a Claude un JSON y lo valida con el esquema. Si no cumple, reintenta una sola vez.
export async function generateValidatedJson<T>(
  textGenerator: TextGenerator,
  request: TextGenerationRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  const first = parseJson(await textGenerator.generate(request), schema);
  if (first.ok) return first.value;

  const retryPrompt = `${request.prompt}\n\nTu respuesta anterior no era válida (${first.error}). Devuelve únicamente el JSON con la forma indicada.`;
  const second = parseJson(await textGenerator.generate({ ...request, prompt: retryPrompt }), schema);
  if (second.ok) return second.value;

  throw new InvalidModelResponseError(second.error);
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function parseJson<T>(text: string, schema: z.ZodType<T>): ParseResult<T> {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(text));
  } catch {
    return { ok: false, error: 'no es JSON' };
  }
  const result = schema.safeParse(json);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: z.prettifyError(result.error) };
}
