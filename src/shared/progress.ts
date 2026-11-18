import type { Collection, VideoKind } from "./catalog";

/** A video counts as watched once 90% of it was played (SPEC §6.2). */
export const COMPLETION_SHARE = 0.9;

export interface ProgressRecord {
  positionSec: number;
  maxPositionSec: number;
  completed: boolean;
}

export type LessonStatus = "done" | "partial" | "new";

export function reachesCompletion(maxPositionSec: number, durationSec: number): boolean {
  return durationSec > 0 && maxPositionSec >= durationSec * COMPLETION_SHARE;
}

export function lessonStatus(progress: ProgressRecord | undefined): LessonStatus {
  if (!progress) return "new";
  if (progress.completed) return "done";
  return progress.maxPositionSec >= 5 ? "partial" : "new";
}

/** Seconds of a video that count as studied. */
export function watchedSeconds(progress: ProgressRecord | undefined, durationSec: number): number {
  if (!progress) return 0;
  if (progress.completed) return durationSec;
  return Math.min(Math.max(0, progress.maxPositionSec), durationSec);
}

/** Course progress 0..1, weighted by video length. Short intros do not count. */
export function courseShare(
  lessons: { kind: VideoKind; durationSec: number; progress?: ProgressRecord }[],
): number {
  const counted = lessons.filter((lesson) => lesson.kind !== "short");
  const total = counted.reduce((sum, lesson) => sum + lesson.durationSec, 0);
  if (total === 0) return 0;
  const watched = counted.reduce(
    (sum, lesson) => sum + watchedSeconds(lesson.progress, lesson.durationSec),
    0,
  );
  return Math.min(1, watched / total);
}

/** Where to start playing: the saved place, or the start if the video was played to the end. */
export function resumePosition(progress: ProgressRecord | undefined, durationSec: number): number {
  if (!progress) return 0;
  const tail = Math.min(15, durationSec * 0.02);
  if (progress.positionSec >= durationSec - tail) return 0;
  return Math.max(0, Math.floor(progress.positionSec));
}

/** The first watched minute moves a course into "В процессе" (SPEC §6.1). */
export function collectionAfterWatching(current: Collection | null): Collection | null {
  return current === null || current === "wishlist" ? "active" : current;
}
