/**
 * Migrations applied at runtime by the runner in `db.ts`, in journal order.
 *
 * The SQL is inlined here (rather than imported from `drizzle/*.sql`) so it is
 * bundled into the `bun build --compile` single-file binary, which does not
 * ship the `drizzle/` folder, and so `tsc` needs no `.sql` module resolution.
 * drizzle-kit remains the generator and snapshot/diff authority: the canonical
 * `.sql` files stay committed under `drizzle/`, and `migrations.test.ts` asserts
 * this inlined copy matches them so the two cannot drift.
 *
 * Workflow for a new migration:
 *   1. `bun run --filter @qwery/adapter-persistence-sqlite db:generate`
 *   2. copy the generated SQL into a new entry below, in journal order
 *   3. tests fail if the copy drifts from the generated file
 */
export interface EmbeddedMigration {
  tag: string;
  sql: string;
}

const init0000 = `
CREATE TABLE IF NOT EXISTS \`datasources\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`description\` text DEFAULT '' NOT NULL,
	\`slug\` text NOT NULL,
	\`datasource_provider\` text NOT NULL,
	\`datasource_driver\` text NOT NULL,
	\`config\` text DEFAULT '{}' NOT NULL,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_datasources_updated_at\` ON \`datasources\` (\`updated_at\`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_datasources_slug\` ON \`datasources\` (\`slug\`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`messages\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`session_id\` text NOT NULL,
	\`role\` text NOT NULL,
	\`content\` text NOT NULL,
	\`metadata\` text DEFAULT '{}' NOT NULL,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_messages_session_created\` ON \`messages\` (\`session_id\`,\`created_at\`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`sessions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`title\` text NOT NULL,
	\`seed_message\` text,
	\`slug\` text NOT NULL,
	\`datasources\` text DEFAULT '[]' NOT NULL,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_sessions_updated_at\` ON \`sessions\` (\`updated_at\`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_sessions_slug\` ON \`sessions\` (\`slug\`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`usage\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`session_id\` text,
	\`message_id\` text,
	\`model\` text NOT NULL,
	\`input_tokens\` integer DEFAULT 0 NOT NULL,
	\`output_tokens\` integer DEFAULT 0 NOT NULL,
	\`total_tokens\` integer DEFAULT 0 NOT NULL,
	\`reasoning_tokens\` integer DEFAULT 0 NOT NULL,
	\`cached_input_tokens\` integer DEFAULT 0 NOT NULL,
	\`cache_write_tokens\` integer DEFAULT 0 NOT NULL,
	\`cost_usd\` real DEFAULT 0 NOT NULL,
	\`input_cost_usd\` real DEFAULT 0 NOT NULL,
	\`output_cost_usd\` real DEFAULT 0 NOT NULL,
	\`duration_ms\` integer DEFAULT 0 NOT NULL,
	\`context_size\` integer DEFAULT 0 NOT NULL,
	\`timestamp\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_usage_session_timestamp\` ON \`usage\` (\`session_id\`,\`timestamp\`);
`;

const init0001 = `
CREATE TABLE \`project_datasources\` (
	\`project_id\` text NOT NULL,
	\`datasource_id\` text NOT NULL,
	\`created_at\` text NOT NULL,
	PRIMARY KEY(\`project_id\`, \`datasource_id\`)
);
--> statement-breakpoint
CREATE INDEX \`idx_project_datasources_datasource\` ON \`project_datasources\` (\`datasource_id\`);--> statement-breakpoint
CREATE TABLE \`projects\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`slug\` text NOT NULL,
	\`path\` text NOT NULL,
	\`name\` text NOT NULL,
	\`created_at\` text NOT NULL,
	\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`idx_projects_slug\` ON \`projects\` (\`slug\`);--> statement-breakpoint
ALTER TABLE \`sessions\` ADD \`project_id\` text;--> statement-breakpoint
CREATE INDEX \`idx_sessions_project\` ON \`sessions\` (\`project_id\`);
`;

export const migrations: readonly EmbeddedMigration[] = [
  { tag: '0000_init', sql: init0000 },
  { tag: '0001_project_scoping', sql: init0001 },
];
