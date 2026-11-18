ALTER TABLE `note_links` ADD `video_id` text;--> statement-breakpoint
ALTER TABLE `note_links` ADD `t_sec` integer;--> statement-breakpoint
CREATE INDEX `note_links_video_idx` ON `note_links` (`video_id`);--> statement-breakpoint
-- The notes index is only a cache of the vault: drop it so the next start re-reads every note
-- and picks up YouTube links and timecodes too.
DELETE FROM `notes`;--> statement-breakpoint
DELETE FROM `notes_fts`;
