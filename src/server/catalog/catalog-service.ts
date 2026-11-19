import type {
  CatalogDto,
  ContinueDto,
  CourseCardDto,
  CourseDetailDto,
  LessonDto,
  UnitDto,
  WatchDto,
} from "@shared/api";
import type { Subject, TrackSlug } from "@shared/catalog";
import {
  courseShare,
  lessonStatus,
  resumePosition,
  watchedSeconds,
  type ProgressRecord,
} from "@shared/progress";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { courses } from "../db/schema";
import type { YouTubeClient } from "../youtube/client";
import * as repo from "./catalog-repository";
import type { CourseRow, LessonRow } from "./catalog-repository";
import { fetchPlaylistVideos, unitsFromLecturePlaylist } from "./playlist-import";
import { replaceCourseUnits } from "./seed";

type ProgressMap = Map<string, ProgressRecord>;

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(key(item)) ?? [];
    list.push(item);
    map.set(key(item), list);
  }
  return map;
}

function shareOf(lessons: LessonRow[], progress: ProgressMap) {
  return courseShare(
    lessons.map((lesson) => ({
      kind: lesson.kind,
      durationSec: lesson.durationSec,
      progress: progress.get(lesson.youtubeId),
    })),
  );
}

export function toLesson(row: LessonRow, progress: ProgressMap): LessonDto {
  const record = progress.get(row.youtubeId);
  return {
    youtubeId: row.youtubeId,
    title: row.title,
    kind: row.kind,
    durationSec: row.durationSec,
    language: row.language,
    embeddable: row.embeddable,
    status: lessonStatus(record),
    progress: row.durationSec > 0 ? watchedSeconds(record, row.durationSec) / row.durationSec : 0,
  };
}

function toCard(course: CourseRow, lessons: LessonRow[], progress: ProgressMap): CourseCardDto {
  const counted = lessons.filter((lesson) => lesson.kind !== "short");
  const cover = lessons.find((lesson) => lesson.kind === "lecture") ?? lessons[0];
  return {
    slug: course.slug,
    title: course.title,
    shortTitle: course.shortTitle,
    university: course.university,
    instructors: course.instructors,
    track: course.trackSlug as TrackSlug,
    order: course.sortOrder,
    subject: course.subject as Subject,
    level: course.level,
    status: course.status,
    collection: course.collection,
    // Translations may have their own thumbnails; the official one looks consistent.
    coverVideoId: cover ? (cover.originalYoutubeId ?? cover.youtubeId) : null,
    progress: shareOf(lessons, progress),
    lessonsTotal: counted.length,
    totalSeconds: counted.reduce((sum, lesson) => sum + lesson.durationSec, 0),
    estimatedHours: course.estimatedHours,
    hasRussian: lessons.some((lesson) => lesson.language === "ru"),
  };
}

function toUnits(lessons: LessonRow[], progress: ProgressMap): UnitDto[] {
  const result: UnitDto[] = [];
  for (const lesson of lessons) {
    let unit = result.at(-1);
    if (!unit || unit.id !== lesson.unitId) {
      unit = { id: lesson.unitId, title: lesson.unitTitle, lessons: [] };
      result.push(unit);
    }
    unit.lessons.push(toLesson(lesson, progress));
  }
  return result;
}

function firstUnfinished(lessons: LessonRow[], progress: ProgressMap) {
  return lessons.find(
    (lesson) => lesson.kind !== "short" && !progress.get(lesson.youtubeId)?.completed,
  );
}

export function getCatalog(db: AppDatabase): CatalogDto {
  const progress = repo.progressByVideo(db);
  const lessonsByCourse = groupBy(repo.listLessons(db), (lesson) => lesson.courseSlug);
  const trackRows = repo.listTracks(db);
  const trackOrder = new Map(trackRows.map((track) => [track.slug, track.sortOrder]));

  return {
    tracks: trackRows.map((track) => ({
      slug: track.slug as TrackSlug,
      title: track.title,
      color: track.color,
      order: track.sortOrder,
      description: track.description,
    })),
    courses: repo
      .listCourses(db)
      .sort(
        (a, b) =>
          (trackOrder.get(a.trackSlug) ?? 0) - (trackOrder.get(b.trackSlug) ?? 0) ||
          a.sortOrder - b.sortOrder,
      )
      .map((course) => toCard(course, lessonsByCourse.get(course.slug) ?? [], progress)),
  };
}

export function getCourseDetail(db: AppDatabase, slug: string): CourseDetailDto | undefined {
  const course = repo.getCourse(db, slug);
  if (!course) return undefined;
  const progress = repo.progressByVideo(db);
  const lessons = repo.listLessons(db, [slug]);

  const prerequisiteRows = repo.prerequisitesOf(db, slug);
  const prerequisiteLessons = groupBy(
    repo.listLessons(
      db,
      prerequisiteRows.map((row) => row.requiresSlug),
    ),
    (lesson) => lesson.courseSlug,
  );
  const prerequisites = prerequisiteRows.flatMap((row) => {
    const required = repo.getCourse(db, row.requiresSlug);
    if (!required) return [];
    const share = shareOf(prerequisiteLessons.get(row.requiresSlug) ?? [], progress);
    return [
      {
        slug: required.slug,
        shortTitle: required.shortTitle,
        title: required.title,
        minProgress: row.minProgress,
        optional: row.optional,
        progress: share,
        met: share >= row.minProgress,
      },
    ];
  });

  const next = firstUnfinished(lessons, progress) ?? lessons[0];
  return {
    ...toCard(course, lessons, progress),
    description: course.description,
    sourceUrl: course.sourceUrl,
    license: course.license,
    verifiedAt: course.verifiedAt,
    translation: course.translation ?? null,
    materials: course.materials,
    skills: course.skills,
    prerequisites,
    units: toUnits(lessons, progress),
    nextYoutubeId: next?.youtubeId ?? null,
    canImport: course.status === "candidate" && course.playlistIds.length > 0,
  };
}

/** Picks the course to show a video in: the asked one, an active one, or the first. */
function courseForVideo(db: AppDatabase, youtubeId: string, preferred?: string) {
  const candidates = repo.coursesWithVideo(db, youtubeId);
  return (
    candidates.find((course) => course.slug === preferred) ??
    candidates.find((course) => course.collection === "active") ??
    candidates[0]
  );
}

export function getWatch(
  db: AppDatabase,
  youtubeId: string,
  preferredCourse?: string,
): WatchDto | undefined {
  const course = courseForVideo(db, youtubeId, preferredCourse);
  const video = repo.getVideo(db, youtubeId);
  if (!course || !video) return undefined;

  const progress = repo.progressByVideo(db);
  const lessons = repo.listLessons(db, [course.slug]);
  const index = lessons.findIndex((lesson) => lesson.youtubeId === youtubeId);
  const row = lessons[index];
  if (!row) return undefined;

  return {
    course: {
      slug: course.slug,
      title: course.title,
      shortTitle: course.shortTitle,
      track: course.trackSlug as TrackSlug,
      units: toUnits(lessons, progress),
    },
    video: {
      ...toLesson(row, progress),
      originalYoutubeId: video.originalYoutubeId,
      resumeSec: resumePosition(progress.get(youtubeId), video.durationSec),
    },
    previousYoutubeId: lessons[index - 1]?.youtubeId ?? null,
    nextYoutubeId: lessons[index + 1]?.youtubeId ?? null,
  };
}

/** The lesson to continue on the home page: the last one touched, or the next after it. */
export function getContinue(db: AppDatabase): ContinueDto | null {
  const progress = repo.progressByVideo(db);
  const latest = [...progress.entries()].sort((a, b) =>
    b[1].updatedAt.localeCompare(a[1].updatedAt),
  )[0];
  if (!latest) return null;
  const [youtubeId, record] = latest;
  const course = courseForVideo(db, youtubeId);
  if (!course) return null;

  const lessons = repo.listLessons(db, [course.slug]);
  const lesson = record.completed
    ? firstUnfinished(lessons, progress)
    : lessons.find((item) => item.youtubeId === youtubeId);
  if (!lesson) return null;
  return {
    course: toCard(course, lessons, progress),
    lesson: toLesson(lesson, progress),
    unitTitle: lesson.unitTitle,
  };
}

export class ImportError extends Error {}

/** "Импортировать видео" for a candidate course (SPEC §6.1): its first official playlist. */
export async function importCourseVideos(db: AppDatabase, youtube: YouTubeClient, slug: string) {
  const course = repo.getCourse(db, slug);
  if (!course) throw new ImportError("Курс не найден");
  const playlistId = course.playlistIds[0];
  if (course.status !== "candidate" || !playlistId) {
    throw new ImportError("У курса нет плейлиста для импорта");
  }
  const units = unitsFromLecturePlaylist(await fetchPlaylistVideos(youtube, playlistId));
  if (units.length === 0) throw new ImportError("В плейлисте не нашлось доступных видео");

  db.transaction((tx) => {
    replaceCourseUnits(tx, slug, units);
    tx.update(courses)
      .set({ status: "imported", importedInApp: true })
      .where(eq(courses.slug, slug))
      .run();
  });
  return getCourseDetail(db, slug);
}
