import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/out/postgres/schema.ts',
  out: './drizzle',
});
