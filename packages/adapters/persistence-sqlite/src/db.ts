import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import { migrations } from './migrations';
import { schema } from './schema';

/** The Drizzle handle the repositories query against, typed with the schema. */
export type DrizzleDb = BunSQLiteDatabase<typeof schema>;

export function defaultDbPath(): string {
  return process.env.QWERY_DB_PATH ?? join(homedir(), '.qwery', 'qwery.sqlite');
}

/**
 * Applies any not-yet-recorded embedded migrations, in order, each in its own
 * transaction. Tags are tracked in `_qwery_migrations`.
 *
 * The baseline (`0000_init`) uses `CREATE TABLE IF NOT EXISTS`, so on databases
 * created by the pre-Drizzle adapter (tables already present under
 * `PRAGMA user_version = 1`) it is a harmless no-op that simply records the tag;
 * on a fresh database it creates the full schema (ADR #35).
 */
function runMigrations(db: Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS _qwery_migrations (
       tag        TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`,
  );
  const applied = new Set(
    (db.query('SELECT tag FROM _qwery_migrations').all() as { tag: string }[]).map((r) => r.tag),
  );
  for (const m of migrations) {
    if (applied.has(m.tag)) continue;
    db.transaction(() => {
      // Statements are separated by `--> statement-breakpoint` lines, which are
      // SQL line comments; `exec` runs the whole script in one call.
      db.exec(m.sql);
      db.run('INSERT INTO _qwery_migrations (tag, applied_at) VALUES (?, ?)', [
        m.tag,
        new Date().toISOString(),
      ]);
    })();
  }
}

/**
 * Opens (creating if needed) the SQLite database, applies migrations, and
 * returns a Drizzle handle. WAL + `busy_timeout` give cross-process readers and
 * a retrying writer, which the previous file adapter's in-process-only lock
 * could not (ADR #35).
 */
export function openDatabase(dbPath = defaultDbPath()): DrizzleDb {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA busy_timeout = 5000');
  runMigrations(sqlite);
  return drizzle(sqlite, { schema });
}
