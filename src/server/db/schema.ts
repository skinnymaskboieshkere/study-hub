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

/** The study plan (SPEC §5, BRIEF: one shared daily budget, subjects take turns). */
export const studyPlans = sqliteTable("study_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startDate: text("start_date").notNull(),
  studyWeekdays: text("study_weekdays_json", { mode: "json" }).$type<number[]>().notNull(),
  minutesPerDay: integer("minutes_per_day").notNull(),
  /** Lighter or heavier days: { "6": 30 }. */
  minutesByWeekday: text("minutes_by_weekday_json", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull(),
  daysOff: text("days_off_json", { mode: "json" }).$type<string[]>().notNull(),
  maxCoursesPerDay: integer("max_courses_per_day").notNull(),
  includePractice: integer("include_practice", { mode: "boolean" }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
  /** Last day the plan was rebuilt; a new day moves unfinished parts forward. */
  replannedOn: text("replanned_on").notNull(),
});

export const planCourses = sqliteTable(
  "plan_courses",
  {
    planId: integer("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    courseSlug: text("course_slug")
      .notNull()
      .references(() => courses.slug, { onDelete: "cascade" }),
    weight: real("weight").notNull(),
    deadline: text("deadline"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [primaryKey({ columns: [table.planId, table.courseSlug] })],
);

/** One planned piece of a video on a day (SPEC §5). */
export const planItems = sqliteTable(
  "plan_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    courseSlug: text("course_slug").notNull(),
    youtubeId: text("youtube_id").notNull(),
    startSec: integer("start_sec").notNull(),
    endSec: integer("end_sec").notNull(),
    status: text("status", { enum: ["planned", "done", "skipped"] }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    doneAt: text("done_at"),
  },
  (table) => [
    index("plan_items_date_idx").on(table.date),
    index("plan_items_video_idx").on(table.youtubeId),
  ],
);

/** "Мои задачи" on the Today screen; date null = not tied to a day. */
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date"),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
  doneAt: text("done_at"),
});

/** Seconds actually played per day and course: streak and statistics (SPEC §5). */
export const studySessions = sqliteTable(
  "study_sessions",
  {
    date: text("date").notNull(),
    courseSlug: text("course_slug").notNull(),
    seconds: real("seconds").notNull(),
  },
  (table) => [primaryKey({ columns: [table.date, table.courseSlug] })],
);

/**
 * Index of the vault (SPEC §5): the .md files are the source of truth, this is only a cache
 * rebuilt from them. Full-text search lives in the FTS5 table `notes_fts` (raw SQL migration).
 */
export const notes = sqliteTable("notes", {
  path: text("path").primaryKey(),
  title: text("title").notNull(),
  mtimeMs: real("mtime_ms").notNull(),
  size: integer("size").notNull(),
  hash: text("hash").notNull(),
  frontmatter: text("frontmatter_json", { mode: "json" }).$type<Record<string, unknown> | null>(),
});

/** Wikilinks as written; they are resolved when read, so new notes pick up old links. */
export const noteLinks = sqliteTable(
  "note_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    srcPath: text("src_path")
      .notNull()
      .references(() => notes.path, { onDelete: "cascade" }),
    rawTarget: text("raw_target").notNull(),
    /** Lower-case name without folders: finds link candidates fast. */
    targetKey: text("target_key").notNull(),
    heading: text("heading"),
    kind: text("kind", { enum: ["wikilink", "embed"] }).notNull(),
    line: integer("line").notNull(),
    context: text("context").notNull(),
  },
  (table) => [
    index("note_links_src_idx").on(table.srcPath),
    index("note_links_key_idx").on(table.targetKey),
  ],
);

export const noteTags = sqliteTable(
  "note_tags",
  {
    path: text("path")
      .notNull()
      .references(() => notes.path, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.path, table.tag] }),
    index("note_tags_tag_idx").on(table.tag),
  ],
);
