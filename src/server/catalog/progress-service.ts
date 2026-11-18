import type { BookmarkDto, ProgressDto } from "@shared/api";
import { collectionAfterWatching, COMPLETION_SHARE, reachesCompletion } from "@shared/progress";
import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { bookmarks, videoProgress } from "../db/schema";
import * as repo from "./catalog-repository";

/** A course counts as started after this many seconds of a video. */
const STARTED_AFTER_SEC = 10;

function moveCoursesToActive(db: AppDatabase, youtubeId: string) {
  for (const course of repo.coursesWithVideo(db, youtubeId)) {
    const next = collectionAfterWatching(course.collection);
    if (next !== course.collection) repo.setCollection(db, course.slug, next);
  }
}

function toDto(row: typeof videoProgress.$inferSelect): ProgressDto {
  return {
    youtubeId: row.youtubeId,
    positionSec: row.positionSec,
    maxPositionSec: row.maxPositionSec,
    completed: row.completedAt !== null,
  };
}

function save(db: AppDatabase, values: typeof videoProgress.$inferInsert) {
  db.insert(videoProgress)
    .values(values)
    .onConflictDoUpdate({ target: videoProgress.youtubeId, set: values })
    .run();
}

/** Saves the player position (SPEC §6.2). Undefined when the video is unknown. */
export function recordProgress(
  db: AppDatabase,
  youtubeId: string,
  positionSec: number,
  now = new Date(),
): ProgressDto | undefined {
  const video = repo.getVideo(db, youtubeId);
  if (!video) return undefined;
  const previous = repo.getProgressRow(db, youtubeId);
  const position = Math.min(positionSec, video.durationSec);
  const maxPositionSec = Math.max(previous?.maxPositionSec ?? 0, position);
  const completedAt =
    previous?.completedAt ??
    (reachesCompletion(maxPositionSec, video.durationSec) ? now.toISOString() : null);

  const values = {
    youtubeId,
    positionSec: position,
    maxPositionSec,
    completedAt,
    updatedAt: now.toISOString(),
  };
  save(db, values);
  if (maxPositionSec >= STARTED_AFTER_SEC) moveCoursesToActive(db, youtubeId);
  return toDto(values);
}

/** Manual "просмотрено" mark and its undo. */
export function setCompletion(
  db: AppDatabase,
  youtubeId: string,
  completed: boolean,
  now = new Date(),
): ProgressDto | undefined {
  const video = repo.getVideo(db, youtubeId);
  if (!video) return undefined;
  const previous = repo.getProgressRow(db, youtubeId);
  const values = {
    youtubeId,
    positionSec: previous?.positionSec ?? 0,
    maxPositionSec: completed
      ? Math.max(previous?.maxPositionSec ?? 0, video.durationSec)
      : // Below the threshold, so the next position update does not complete it again.
        Math.min(
          previous?.maxPositionSec ?? 0,
          Math.floor(video.durationSec * (COMPLETION_SHARE - 0.01)),
        ),
    completedAt: completed ? (previous?.completedAt ?? now.toISOString()) : null,
    updatedAt: now.toISOString(),
  };
  save(db, values);
  if (completed) moveCoursesToActive(db, youtubeId);
  return toDto(values);
}

function toBookmark(row: typeof bookmarks.$inferSelect): BookmarkDto {
  return {
    id: row.id,
    youtubeId: row.youtubeId,
    tSec: row.tSec,
    label: row.label,
    createdAt: row.createdAt,
  };
}

export function getBookmarks(db: AppDatabase, youtubeId: string): BookmarkDto[] {
  return repo.listBookmarks(db, youtubeId).map(toBookmark);
}

export function addBookmark(
  db: AppDatabase,
  youtubeId: string,
  tSec: number,
  label: string,
  now = new Date(),
): BookmarkDto | undefined {
  const video = repo.getVideo(db, youtubeId);
  if (!video) return undefined;
  const [row] = db
    .insert(bookmarks)
    .values({
      youtubeId,
      tSec: Math.min(tSec, video.durationSec),
      label,
      createdAt: now.toISOString(),
    })
    .returning()
    .all();
  return row ? toBookmark(row) : undefined;
}

export function deleteBookmark(db: AppDatabase, id: number): boolean {
  const deleted = db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, id)))
    .returning()
    .all();
  return deleted.length > 0;
}
