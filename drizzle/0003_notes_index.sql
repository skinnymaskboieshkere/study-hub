CREATE TABLE `note_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`src_path` text NOT NULL,
	`raw_target` text NOT NULL,
	`target_key` text NOT NULL,
	`heading` text,
	`kind` text NOT NULL,
	`line` integer NOT NULL,
	`context` text NOT NULL,
	FOREIGN KEY (`src_path`) REFERENCES `notes`(`path`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `note_links_src_idx` ON `note_links` (`src_path`);--> statement-breakpoint
CREATE INDEX `note_links_key_idx` ON `note_links` (`target_key`);--> statement-breakpoint
CREATE TABLE `note_tags` (
	`path` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`path`, `tag`),
	FOREIGN KEY (`path`) REFERENCES `notes`(`path`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `note_tags_tag_idx` ON `note_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `notes` (
	`path` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`mtime_ms` real NOT NULL,
	`size` integer NOT NULL,
	`hash` text NOT NULL,
	`frontmatter_json` text
);
