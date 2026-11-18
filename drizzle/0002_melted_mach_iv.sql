CREATE TABLE `plan_courses` (
	`plan_id` integer NOT NULL,
	`course_slug` text NOT NULL,
	`weight` real NOT NULL,
	`deadline` text,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`plan_id`, `course_slug`),
	FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_slug`) REFERENCES `courses`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`date` text NOT NULL,
	`course_slug` text NOT NULL,
	`youtube_id` text NOT NULL,
	`start_sec` integer NOT NULL,
	`end_sec` integer NOT NULL,
	`status` text NOT NULL,
	`sort_order` integer NOT NULL,
	`done_at` text,
	FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_items_date_idx` ON `plan_items` (`date`);--> statement-breakpoint
CREATE INDEX `plan_items_video_idx` ON `plan_items` (`youtube_id`);--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text NOT NULL,
	`study_weekdays_json` text NOT NULL,
	`minutes_per_day` integer NOT NULL,
	`minutes_by_weekday_json` text NOT NULL,
	`days_off_json` text NOT NULL,
	`max_courses_per_day` integer NOT NULL,
	`include_practice` integer NOT NULL,
	`active` integer NOT NULL,
	`created_at` text NOT NULL,
	`replanned_on` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`date` text NOT NULL,
	`course_slug` text NOT NULL,
	`seconds` real NOT NULL,
	PRIMARY KEY(`date`, `course_slug`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text,
	`title` text NOT NULL,
	`done` integer NOT NULL,
	`created_at` text NOT NULL,
	`done_at` text
);
