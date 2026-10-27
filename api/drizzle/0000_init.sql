CREATE TABLE `diagrams` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`type` text NOT NULL,
	`mermaid_code` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diagrams_meeting_id_unique` ON `diagrams` (`meeting_id`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`duration_seconds` integer,
	`language` text DEFAULT 'es' NOT NULL,
	`status` text DEFAULT 'transcribiendo' NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`resumen` text NOT NULL,
	`decisiones` text NOT NULL,
	`tareas` text NOT NULL,
	`temas` text NOT NULL,
	`model` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `summaries_meeting_id_unique` ON `summaries` (`meeting_id`);--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`text` text NOT NULL,
	`segments` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transcripts_meeting_id_unique` ON `transcripts` (`meeting_id`);