import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/** App settings as key → JSON value (SPEC §5). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
});
