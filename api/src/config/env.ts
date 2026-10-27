import { z } from 'zod';

const envSchema = z.object({
  // Archivo de SQLite; una ruta relativa parte de la carpeta desde la que se arranca la API
  DATABASE_PATH: z.string().min(1).default('./data/reuniones.db'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  STT_URL: z.url(),
  CLAUDE_PROVIDER: z.enum(['subscription', 'api']).default('subscription'),
  ANTHROPIC_API_KEY: z.string().optional(),
  MODEL_FAST: z.string().min(1).default('claude-haiku-5-5'),
  MODEL_MAIN: z.string().min(1).default('claude-sonnet-5-5'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Variables de entorno no válidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
