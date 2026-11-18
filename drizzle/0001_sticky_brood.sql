CREATE TABLE `bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`youtube_id` text NOT NULL,
	`t_sec` real NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmarks_video_idx` ON `bookmarks` (`youtube_id`);--> statement-breakpoint
CREATE TABLE `course_prerequisites` (
	`course_slug` text NOT NULL,
	`requires_slug` text NOT NULL,
	`min_progress` real NOT NULL,
	PRIMARY KEY(`course_slug`, `requires_slug`),
	FOREIGN KEY (`course_slug`) REFERENCES `courses`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requires_slug`) REFERENCES `courses`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `course_videos` (
	`course_slug` text NOT NULL,
	`youtube_id` text NOT NULL,
	`unit_id` integer NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`course_slug`, `youtube_id`),
	FOREIGN KEY (`course_slug`) REFERENCES `courses`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`youtube_id`) REFERENCES `videos`(`youtube_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `course_videos_video_idx` ON `course_videos` (`youtube_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`short_title` text NOT NULL,
	`university` text NOT NULL,
	`instructors_json` text NOT NULL,
	`subject` text NOT NULL,
	`level` integer NOT NULL,
	`description` text NOT NULL,
	`track_slug` text NOT NULL,
	`sort_order` integer NOT NULL,
	`source_url` text NOT NULL,
	`license` text NOT NULL,
	`status` text NOT NULL,
	`collection` text,
	`verified_at` text NOT NULL,
	`estimated_hours` real,
	`translation_json` text,
	`materials_json` text NOT NULL,
	`skills_json` text NOT NULL,
	`playlist_ids_json` text NOT NULL,
	`imported_in_app` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`track_slug`) REFERENCES `tracks`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_slug` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`course_slug`) REFERENCES `courses`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `video_progress` (
	`youtube_id` text PRIMARY KEY NOT NULL,
	`position_sec` real NOT NULL,
	`max_position_sec` real NOT NULL,
	`completed_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`youtube_id` text PRIMARY KEY NOT NULL,
	`duration_sec` integer NOT NULL,
	`language` text NOT NULL,
	`original_youtube_id` text,
	`embeddable` integer NOT NULL
);
