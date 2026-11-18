import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface OpenDatabaseOptions {
  /** Path to the SQLite file, or ":memory:" for tests. */
  file: string;
  migrationsDir: string;
}

/** Opens the database and applies pending migrations. */
export function openDatabase({ file, migrationsDir }: OpenDatabaseOptions) {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db: AppDatabase = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsDir });

  return { db, close: () => sqlite.close() };
}
