-- Baseline migration. Hand-edited to use IF NOT EXISTS so it applies as a no-op
-- on databases created by the pre-Drizzle adapter (which already hold these
-- tables under `PRAGMA user_version = 1`) while still creating everything on a
-- fresh database. Structure matches src/schema.ts; do not regenerate this file
-- without re-applying the IF NOT EXISTS edits.
CREATE TABLE IF NOT EXISTS `datasources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`slug` text NOT NULL,
	`datasource_provider` text NOT NULL,
	`datasource_driver` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_datasources_updated_at` ON `datasources` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_datasources_slug` ON `datasources` (`slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_messages_session_created` ON `messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`seed_message` text,
	`slug` text NOT NULL,
	`datasources` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_sessions_updated_at` ON `sessions` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_sessions_slug` ON `sessions` (`slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `usage` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`message_id` text,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`cached_input_tokens` integer DEFAULT 0 NOT NULL,
	`cache_write_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`input_cost_usd` real DEFAULT 0 NOT NULL,
	`output_cost_usd` real DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`context_size` integer DEFAULT 0 NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_usage_session_timestamp` ON `usage` (`session_id`,`timestamp`);
