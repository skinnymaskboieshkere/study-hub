import type { ProgressRecord } from "@shared/progress";
import { asc, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import {
  bookmarks,
  coursePrerequisites,
  courses,
  courseVideos,
  tracks,
  units,
  videoProgress,
  videos,
} from "../db/schema";

export type CourseRow = typeof courses.$inferSelect;

export interface LessonRow {
  courseSlug: string;
  unitId: number;
  unitTitle: string;
  unitOrder: number;
  youtubeId: string;
  title: string;
  kind: (typeof courseVideos.$inferSelect)["kind"];
  sortOrder: number;
  durationSec: number;
  language: "en" | "ru";
  originalYoutubeId: string | null;
  embeddable: boolean;
}

export function listTracks(db: AppDatabase) {
  return db.select().from(tracks).orderBy(asc(tracks.sortOrder)).all();
}

export function listCourses(db: AppDatabase): CourseRow[] {
  return db.select().from(courses).orderBy(asc(courses.sortOrder)).all();
}

export function getCourse(db: AppDatabase, slug: string): CourseRow | undefined {
  return db.select().from(courses).where(eq(courses.slug, slug)).get();
}

/** Lessons in program order; all courses when `slugs` is omitted. */
export function listLessons(db: AppDatabase, slugs?: string[]): LessonRow[] {
  const query = db
    .select({
      courseSlug: courseVideos.courseSlug,
      unitId: units.id,
      unitTitle: units.title,
      unitOrder: units.sortOrder,
      youtubeId: courseVideos.youtubeId,
      title: courseVideos.title,
      kind: courseVideos.kind,
      sortOrder: courseVideos.sortOrder,
      durationSec: videos.durationSec,
      language: videos.language,
      originalYoutubeId: videos.originalYoutubeId,
      embeddable: videos.embeddable,
    })
    .from(courseVideos)
    .innerJoin(units, eq(units.id, courseVideos.unitId))
    .innerJoin(videos, eq(videos.youtubeId, courseVideos.youtubeId));
  const filtered = slugs ? query.where(inArray(courseVideos.courseSlug, slugs)) : query;
  return filtered.orderBy(asc(courseVideos.courseSlug), asc(courseVideos.sortOrder)).all();
}

export function progressByVideo(
  db: AppDatabase,
): Map<string, ProgressRecord & { updatedAt: string }> {
  return new Map(
    db
      .select()
      .from(videoProgress)
      .all()
      .map((row) => [
        row.youtubeId,
        {
          positionSec: row.positionSec,
          maxPositionSec: row.maxPositionSec,
          completed: row.completedAt !== null,
          updatedAt: row.updatedAt,
        },
      ]),
  );
}

export function getProgressRow(db: AppDatabase, youtubeId: string) {
  return db.select().from(videoProgress).where(eq(videoProgress.youtubeId, youtubeId)).get();
}

export function prerequisitesOf(db: AppDatabase, courseSlug: string) {
  return db
    .select()
    .from(coursePrerequisites)
    .where(eq(coursePrerequisites.courseSlug, courseSlug))
    .all();
}

export function getVideo(db: AppDatabase, youtubeId: string) {
  return db.select().from(videos).where(eq(videos.youtubeId, youtubeId)).get();
}

export function coursesWithVideo(db: AppDatabase, youtubeId: string): CourseRow[] {
  return db
    .select({ course: courses })
    .from(courseVideos)
    .innerJoin(courses, eq(courses.slug, courseVideos.courseSlug))
    .where(eq(courseVideos.youtubeId, youtubeId))
    .all()
    .map((row) => row.course);
}

export function setCollection(db: AppDatabase, slug: string, collection: CourseRow["collection"]) {
  db.update(courses).set({ collection }).where(eq(courses.slug, slug)).run();
}

export function listBookmarks(db: AppDatabase, youtubeId: string) {
  return db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.youtubeId, youtubeId))
    .orderBy(asc(bookmarks.tSec))
    .all();
}
