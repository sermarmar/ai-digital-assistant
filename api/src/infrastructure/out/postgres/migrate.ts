import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Database } from './database.js';

// Carpeta api/drizzle, donde drizzle-kit genera los .sql (desde src/ o dist/ está a la misma altura)
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../../../drizzle', import.meta.url));

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
