import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export type Database = BetterSQLite3Database;

export function createDatabase(databasePath: string): { db: Database; close: () => void } {
  mkdirSync(dirname(databasePath), { recursive: true });
  const client = new BetterSqlite3(databasePath);
  // WAL deja leer mientras se escribe (la API consulta reuniones mientras otra se procesa)
  client.pragma('journal_mode = WAL');
  // SQLite no aplica las claves foráneas (ni el borrado en cascada) si no se activan en cada conexión
  client.pragma('foreign_keys = ON');
  return { db: drizzle(client), close: () => client.close() };
}
