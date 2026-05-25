import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** Bump when the schema changes; `migrate` applies steps up to this version. */
const SCHEMA_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  seed_message TEXT,
  slug        TEXT NOT NULL,
  datasources TEXT NOT NULL DEFAULT '[]', -- JSON array of datasource ids
  created_at  TEXT NOT NULL,              -- ISO 8601
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_slug ON sessions (slug);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,              -- JSON
  metadata    TEXT NOT NULL DEFAULT '{}', -- JSON
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS usage (
  id                 TEXT PRIMARY KEY,
  session_id         TEXT,
  message_id         TEXT,
  model              TEXT NOT NULL,
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  total_tokens       INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens   INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd           REAL NOT NULL DEFAULT 0,
  input_cost_usd     REAL NOT NULL DEFAULT 0,
  output_cost_usd    REAL NOT NULL DEFAULT 0,
  duration_ms        INTEGER NOT NULL DEFAULT 0,
  context_size       INTEGER NOT NULL DEFAULT 0,
  timestamp          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_session_timestamp ON usage (session_id, timestamp);

CREATE TABLE IF NOT EXISTS datasources (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  slug                TEXT NOT NULL,
  datasource_provider TEXT NOT NULL,
  datasource_driver   TEXT NOT NULL,
  config              TEXT NOT NULL DEFAULT '{}', -- JSON (may hold enc:v1: handles)
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_datasources_updated_at ON datasources (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_datasources_slug ON datasources (slug);
`;

export function defaultDbPath(): string {
  return process.env.QWERY_DB_PATH ?? join(homedir(), '.qwery', 'qwery.sqlite');
}

function migrate(db: Database): void {
  const row = db.query('PRAGMA user_version').get() as { user_version: number };
  if (row.user_version >= SCHEMA_VERSION) return;
  db.transaction(() => {
    if (row.user_version < 1) db.exec(SCHEMA_V1);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  })();
}

/**
 * Opens (creating if needed) the SQLite database and applies migrations.
 * WAL + `busy_timeout` give cross-process readers and a retrying writer, which
 * the previous file adapter's in-process-only lock could not (ADR #35).
 */
export function openDatabase(dbPath = defaultDbPath()): Database {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath, { create: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  migrate(db);
  return db;
}
