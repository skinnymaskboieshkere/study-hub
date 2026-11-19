import type { CalendarDto, PlanItemDto, TodayDto, TrackProgressDto } from "@shared/api";
import type { Subject, TrackSlug } from "@shared/catalog";
import { addDays, startOfWeek } from "@shared/dates";
import { hoursToComputerVision, trackShares } from "@shared/roadmap";
import { studyStreak } from "@shared/streak";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { getCatalog } from "../catalog/catalog-service";
import type { AppDatabase } from "../db/client";
import { roadmapCourses } from "../roadmap/roadmap-service";
import { courses, courseVideos, planItems, studySessions, videos } from "../db/schema";
import { activeDates, ensureFresh, getPlanDto } from "./plan-service";

/** Plan parts between two dates with everything a card needs. */
export function itemsBetween(db: AppDatabase, from: string, to: string): PlanItemDto[] {
  return db
    .select({ item: planItems, lesson: courseVideos, video: videos, course: courses })
    .from(planItems)
    .innerJoin(
      courseVideos,
      and(
        eq(courseVideos.courseSlug, planItems.courseSlug),
        eq(courseVideos.youtubeId, planItems.youtubeId),
      ),
    )
    .innerJoin(videos, eq(videos.youtubeId, planItems.youtubeId))
    .innerJoin(courses, eq(courses.slug, planItems.courseSlug))
    .where(and(gte(planItems.date, from), lte(planItems.date, to)))
    .orderBy(asc(planItems.date), asc(planItems.sortOrder), asc(planItems.id))
    .all()
    .map(({ item, lesson, video, course }) => ({
      id: item.id,
      date: item.date,
      status: item.status,
      courseSlug: course.slug,
      courseShortTitle: course.shortTitle,
      track: course.trackSlug as TrackSlug,
      subject: course.subject as Subject,
      youtubeId: item.youtubeId,
      coverVideoId: video.originalYoutubeId ?? item.youtubeId,
      lessonTitle: lesson.title,
      kind: lesson.kind,
      startSec: item.startSec,
      endSec: item.endSec,
      videoDurationSec: video.durationSec,
      embeddable: video.embeddable,
      language: video.language,
    }));
}

const length = (item: PlanItemDto) => item.endSec - item.startSec;

/** The "прогресс к CV" widget: hours to the CV track and each track's share (SPEC §6.4). */
function cvProgress(db: AppDatabase): TodayDto["cv"] {
  const catalogDto = getCatalog(db);
  const roadmap = roadmapCourses(db, catalogDto);
  const shares = trackShares(roadmap);
  const tracks: TrackProgressDto[] = catalogDto.tracks.map((track) => ({
    slug: track.slug,
    title: track.title,
    color: track.color,
    share: shares[track.slug],
  }));
  return { hoursLeft: hoursToComputerVision(roadmap), tracks };
}

export function getToday(db: AppDatabase, date: string): TodayDto {
  ensureFresh(db, date);
  const plan = getPlanDto(db, date);
  const items = itemsBetween(db, date, date);

  const monday = startOfWeek(date);
  const sunday = addDays(monday, 6);
  const weekItems = itemsBetween(db, monday, sunday);
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(monday, index);
    const dayItems = weekItems.filter((item) => item.date === day);
    return {
      date: day,
      plannedSec: dayItems.reduce((sum, item) => sum + length(item), 0),
      doneSec: dayItems
        .filter((item) => item.status === "done")
        .reduce((sum, item) => sum + length(item), 0),
      tracks: [...new Set(dayItems.map((item) => item.track))],
    };
  });

  const studied = db
    .select({ seconds: sql<number>`coalesce(sum(${studySessions.seconds}), 0)` })
    .from(studySessions)
    .where(eq(studySessions.date, date))
    .get();

  return {
    date,
    plan: plan ? { id: plan.id, minutesPerDay: plan.minutesPerDay, endDate: plan.endDate } : null,
    items,
    plannedSec: items.reduce((sum, item) => sum + length(item), 0),
    doneSec: items
      .filter((item) => item.status === "done")
      .reduce((sum, item) => sum + length(item), 0),
    studiedSec: Math.round(Number(studied?.seconds ?? 0)),
    streak: studyStreak(activeDates(db, addDays(date, -400), date), date),
    week,
    cv: cvProgress(db),
  };
}

export function getCalendar(db: AppDatabase, from: string, to: string): CalendarDto {
  const items = itemsBetween(db, from, to);
  const days: CalendarDto["days"] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push({ date: day, items: items.filter((item) => item.date === day) });
  }
  return { from, to, days };
}

/** Lesson facts for a single part (the player shows "часть N из M"). */
export function getItem(db: AppDatabase, id: number): PlanItemDto | undefined {
  const row = db.select().from(planItems).where(eq(planItems.id, id)).get();
  if (!row) return undefined;
  return itemsBetween(db, row.date, row.date).find((item) => item.id === id);
}
