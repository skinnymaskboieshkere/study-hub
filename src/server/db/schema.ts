import { COLLECTIONS, VIDEO_KINDS, type SeedCourse } from "@shared/catalog";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** App settings as key → JSON value (SPEC §5). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
});

export const tracks = sqliteTable("tracks", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull(),
  description: text("description").notNull(),
});

export const courses = sqliteTable("courses", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull(),
  university: text("university").notNull(),
  instructors: text("instructors_json", { mode: "json" }).$type<string[]>().notNull(),
  subject: text("subject").notNull(),
  level: integer("level").notNull(),
  description: text("description").notNull(),
  trackSlug: text("track_slug")
    .notNull()
    .references(() => tracks.slug),
  sortOrder: integer("sort_order").notNull(),
  sourceUrl: text("source_url").notNull(),
  license: text("license").notNull(),
  status: text("status", { enum: ["candidate", "imported"] }).notNull(),
  /** Null: the course is only in the catalog, in no collection. */
  collection: text("collection", { enum: COLLECTIONS }),
  verifiedAt: text("verified_at").notNull(),
  estimatedHours: real("estimated_hours"),
  translation: text("translation_json", { mode: "json" }).$type<SeedCourse["translation"]>(),
  materials: text("materials_json", { mode: "json" }).$type<SeedCourse["materials"]>().notNull(),
  skills: text("skills_json", { mode: "json" }).$type<string[]>().notNull(),
  playlistIds: text("playlist_ids_json", { mode: "json" }).$type<string[]>().notNull(),
  /** True when the videos were imported from the app, not from seed/. */
  importedInApp: integer("imported_in_app", { mode: "boolean" }).notNull().default(false),
});

export const coursePrerequisites = sqliteTable(
  "course_prerequisites",
  {
    courseSlug: text("course_slug")
      .notNull()
      .references(() => courses.slug, { onDelete: "cascade" }),
    requiresSlug: text("requires_slug")
      .notNull()
      .references(() => courses.slug, { onDelete: "cascade" }),
    minProgress: real("min_progress").notNull(),
  },
  (table) => [primaryKey({ columns: [table.courseSlug, table.requiresSlug] })],
);

export const units = sqliteTable("units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseSlug: text("course_slug")
    .notNull()
    .references(() => courses.slug, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

/** One row per YouTube video; the same video may sit in several courses (ASSESSMENT §3). */
export const videos = sqliteTable("videos", {
  youtubeId: text("youtube_id").primaryKey(),
  durationSec: integer("duration_sec").notNull(),
  language: text("language", { enum: ["en", "ru"] }).notNull(),
  originalYoutubeId: text("original_youtube_id"),
  embeddable: integer("embeddable", { mode: "boolean" }).notNull(),
});

/** Where a video sits in a course, with its title and kind in that course. */
export const courseVideos = sqliteTable(
  "course_videos",
  {
    courseSlug: text("course_slug")
      .notNull()
      .references(() => courses.slug, { onDelete: "cascade" }),
    youtubeId: text("youtube_id")
      .notNull()
      .references(() => videos.youtubeId),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: VIDEO_KINDS }).notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.courseSlug, table.youtubeId] }),
    index("course_videos_video_idx").on(table.youtubeId),
  ],
);

/** Watching progress. No foreign key: it must survive catalog rebuilds. */
export const videoProgress = sqliteTable("video_progress", {
  youtubeId: text("youtube_id").primaryKey(),
  positionSec: real("position_sec").notNull(),
  maxPositionSec: real("max_position_sec").notNull(),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull(),
});

/** Quick marks inside a video (SPEC §5). */
export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    youtubeId: text("youtube_id").notNull(),
    tSec: real("t_sec").notNull(),
    label: text("label").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("bookmarks_video_idx").on(table.youtubeId)],
);
