import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type Database = PostgresJsDatabase;

export function createDatabase(databaseUrl: string): { db: Database; close: () => Promise<void> } {
  // onnotice silencia avisos informativos de Postgres (p. ej. "already exists, skipping" al migrar)
  const client = postgres(databaseUrl, { onnotice: () => {} });
  return { db: drizzle(client), close: () => client.end() };
}
