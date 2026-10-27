import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/out/sqlite/schema.ts',
  out: './drizzle',
});
