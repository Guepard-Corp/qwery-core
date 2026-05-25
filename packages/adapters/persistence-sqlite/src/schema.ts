import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Drizzle schema mirroring the original raw-SQL `SCHEMA_V1`: timestamps are
 * ISO-8601 TEXT, JSON payloads are TEXT, same column and index names. Keeping
 * names identical lets the baseline migration apply as a no-op on databases
 * already created by the pre-Drizzle adapter (see `db.ts`).
 *
 * The original `updated_at DESC` indexes are declared without an explicit
 * direction here: SQLite traverses an index in either direction, so
 * `ORDER BY updated_at DESC LIMIT n` is served just as efficiently. Databases
 * created before this change keep their DESC index (the baseline is a no-op).
 */

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    seedMessage: text('seed_message'),
    slug: text('slug').notNull(),
    // JSON array of datasource ids.
    datasources: text('datasources').notNull().default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_sessions_updated_at').on(t.updatedAt), index('idx_sessions_slug').on(t.slug)],
);

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(), // JSON
    metadata: text('metadata').notNull().default('{}'), // JSON
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_messages_session_created').on(t.sessionId, t.createdAt)],
);

export const usage = sqliteTable(
  'usage',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id'),
    messageId: text('message_id'),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    reasoningTokens: integer('reasoning_tokens').notNull().default(0),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    costUsd: real('cost_usd').notNull().default(0),
    inputCostUsd: real('input_cost_usd').notNull().default(0),
    outputCostUsd: real('output_cost_usd').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    contextSize: integer('context_size').notNull().default(0),
    timestamp: text('timestamp').notNull(),
  },
  (t) => [index('idx_usage_session_timestamp').on(t.sessionId, t.timestamp)],
);

export const datasources = sqliteTable(
  'datasources',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    slug: text('slug').notNull(),
    datasourceProvider: text('datasource_provider').notNull(),
    datasourceDriver: text('datasource_driver').notNull(),
    // JSON (may hold enc:v1: vault handles).
    config: text('config').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_datasources_updated_at').on(t.updatedAt), index('idx_datasources_slug').on(t.slug)],
);

/** Aggregate handed to `drizzle(db, { schema })` for typed relational queries. */
export const schema = { sessions, messages, usage, datasources };
