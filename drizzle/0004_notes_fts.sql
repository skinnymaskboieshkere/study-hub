-- Full-text search over the vault (SPEC §6.5, Ctrl+Shift+F). unicode61 folds case for Cyrillic too.
CREATE VIRTUAL TABLE `notes_fts` USING fts5(
	`path` UNINDEXED,
	`title`,
	`body`,
	tokenize = 'unicode61 remove_diacritics 2'
);
