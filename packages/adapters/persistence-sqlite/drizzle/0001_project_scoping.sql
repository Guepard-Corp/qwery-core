CREATE TABLE `project_datasources` (
	`project_id` text NOT NULL,
	`datasource_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `datasource_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_project_datasources_datasource` ON `project_datasources` (`datasource_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`path` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_slug` ON `projects` (`slug`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `project_id` text;--> statement-breakpoint
CREATE INDEX `idx_sessions_project` ON `sessions` (`project_id`);