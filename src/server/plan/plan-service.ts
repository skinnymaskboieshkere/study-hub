import type { PlanDto, PlanInput } from "@shared/api";
import { PRACTICE_KINDS } from "@shared/catalog";
import { todayIso } from "@shared/dates";
import { buildSchedule, type ScheduleCourse } from "@shared/scheduler";
import { and, asc, eq, gte, inArray, lte, max, sql } from "drizzle-orm";
import * as catalog from "../catalog/catalog-repository";
import type { AppDatabase } from "../db/client";
import { courses, planCourses, planItems, studyPlans, studySessions } from "../db/schema";

type Db = AppDatabase | Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];
export type PlanRow = typeof studyPlans.$inferSelect;

export class PlanError extends Error {}

export function getActivePlan(db: Db): PlanRow | undefined {
  return db.select().from(studyPlans).where(eq(studyPlans.active, true)).get();
}

function planCourseRows(db: Db, planId: number) {
  return db
    .select()
    .from(planCourses)
    .where(eq(planCourses.planId, planId))
    .orderBy(asc(planCourses.sortOrder))
    .all();
}

/** Time each course already got in this plan: keeps the subjects taking turns. */
function studiedByCourse(db: Db, planId: number): Map<string, number> {
  const rows = db
    .select({
      courseSlug: planItems.courseSlug,
      seconds: sql<number>`sum(${planItems.endSec} - ${planItems.startSec})`,
    })
    .from(planItems)
    .where(and(eq(planItems.planId, planId), eq(planItems.status, "done")))
    .groupBy(planItems.courseSlug)
    .all();
  return new Map(rows.map((row) => [row.courseSlug, Number(row.seconds)]));
}

/** Unwatched lectures (and practice) of the plan's courses, from the furthest watched point. */
function scheduleCourses(db: Db, plan: PlanRow): ScheduleCourse[] {
  const rows = planCourseRows(db, plan.id);
  const lessons = catalog.listLessons(
    db as AppDatabase,
    rows.map((row) => row.courseSlug),
  );
  const progress = catalog.progressByVideo(db as AppDatabase);
  const studied = studiedByCourse(db, plan.id);

  return rows.map((row) => ({
    slug: row.courseSlug,
    weight: row.weight,
    deadline: row.deadline ?? undefined,
    studiedSec: studied.get(row.courseSlug) ?? 0,
    videos: lessons
      .filter((lesson) => lesson.courseSlug === row.courseSlug)
      .filter(
        (lesson) =>
          lesson.kind === "lecture" ||
          (plan.includePractice && PRACTICE_KINDS.includes(lesson.kind)),
      )
      .filter((lesson) => !progress.get(lesson.youtubeId)?.completed)
      .map((lesson) => ({
        youtubeId: lesson.youtubeId,
        durationSec: lesson.durationSec,
        fromSec: Math.floor(progress.get(lesson.youtubeId)?.maxPositionSec ?? 0),
      })),
  }));
}

/**
 * Rebuilds the plan from `today` (SPEC §6.4): unfinished parts of past days move forward
 * and push the rest; finished parts stay where they were done.
 */
export function replan(db: AppDatabase, today: string): number {
  const plan = getActivePlan(db);
  if (!plan) return 0;

  return db.transaction((tx) => {
    tx.delete(planItems)
      .where(and(eq(planItems.planId, plan.id), eq(planItems.status, "planned")))
      .run();

    const start = plan.startDate > today ? plan.startDate : today;
    const doneToday = tx
      .select({
        seconds: sql<number>`coalesce(sum(${planItems.endSec} - ${planItems.startSec}), 0)`,
      })
      .from(planItems)
      .where(
        and(eq(planItems.planId, plan.id), eq(planItems.date, start), eq(planItems.status, "done")),
      )
      .get();

    const parts = buildSchedule({
      startDate: start,
      studyWeekdays: plan.studyWeekdays,
      minutesPerDay: plan.minutesPerDay,
      minutesByWeekday: Object.fromEntries(
        Object.entries(plan.minutesByWeekday).map(([day, minutes]) => [Number(day), minutes]),
      ),
      daysOff: plan.daysOff,
      maxCoursesPerDay: plan.maxCoursesPerDay,
      usedOnStartSec: Number(doneToday?.seconds ?? 0),
      courses: scheduleCourses(tx, plan),
    });

    const orderByDay = new Map<string, number>();
    for (const part of parts) {
      const sortOrder = orderByDay.get(part.date) ?? 0;
      orderByDay.set(part.date, sortOrder + 1);
      tx.insert(planItems)
        .values({ planId: plan.id, ...part, status: "planned", sortOrder })
        .run();
    }
    tx.update(studyPlans).set({ replannedOn: today }).where(eq(studyPlans.id, plan.id)).run();
    return parts.length;
  });
}

/** On the first visit of a new day the plan catches up with what was (not) done. */
export function ensureFresh(db: AppDatabase, today: string) {
  const plan = getActivePlan(db);
  if (plan && plan.replannedOn !== today) replan(db, today);
}

/** Replaces the active plan with the wizard's choice and lays it out. */
export function savePlan(db: AppDatabase, input: PlanInput, today = todayIso()): PlanDto {
  const known = db
    .select({ slug: courses.slug, status: courses.status })
    .from(courses)
    .where(
      inArray(
        courses.slug,
        input.courses.map((course) => course.slug),
      ),
    )
    .all();
  for (const course of input.courses) {
    const row = known.find((item) => item.slug === course.slug);
    if (!row) throw new PlanError(`Курс «${course.slug}» не найден`);
    if (row.status !== "imported") throw new PlanError("В план можно взять только курсы с видео");
  }

  db.transaction((tx) => {
    // Old plans stay for history; only their unfinished parts go away.
    tx.update(studyPlans).set({ active: false }).run();
    tx.delete(planItems).where(eq(planItems.status, "planned")).run();
    const [plan] = tx
      .insert(studyPlans)
      .values({
        startDate: input.startDate,
        studyWeekdays: [...new Set(input.studyWeekdays)].sort(),
        minutesPerDay: input.minutesPerDay,
        minutesByWeekday: input.minutesByWeekday,
        daysOff: input.daysOff,
        maxCoursesPerDay: input.maxCoursesPerDay,
        includePractice: input.includePractice,
        active: true,
        createdAt: new Date().toISOString(),
        replannedOn: "",
      })
      .returning()
      .all();
    if (!plan) throw new PlanError("Не удалось сохранить план");
    input.courses.forEach((course, sortOrder) =>
      tx
        .insert(planCourses)
        .values({
          planId: plan.id,
          courseSlug: course.slug,
          weight: course.weight,
          deadline: course.deadline,
          sortOrder,
        })
        .run(),
    );
  });
  replan(db, today);
  const plan = getPlanDto(db, today);
  if (!plan) throw new PlanError("Не удалось сохранить план");
  return plan;
}

export function getPlanDto(db: AppDatabase, today = todayIso()): PlanDto | undefined {
  const plan = getActivePlan(db);
  if (!plan) return undefined;
  const rows = db
    .select({ planCourse: planCourses, course: courses })
    .from(planCourses)
    .innerJoin(courses, eq(courses.slug, planCourses.courseSlug))
    .where(eq(planCourses.planId, plan.id))
    .orderBy(asc(planCourses.sortOrder))
    .all();
  const remaining = db
    .select({
      endDate: max(planItems.date),
      seconds: sql<number>`coalesce(sum(${planItems.endSec} - ${planItems.startSec}), 0)`,
    })
    .from(planItems)
    .where(
      and(
        eq(planItems.planId, plan.id),
        eq(planItems.status, "planned"),
        gte(planItems.date, today),
      ),
    )
    .get();

  return {
    id: plan.id,
    startDate: plan.startDate,
    studyWeekdays: plan.studyWeekdays,
    minutesPerDay: plan.minutesPerDay,
    minutesByWeekday: plan.minutesByWeekday,
    daysOff: plan.daysOff,
    maxCoursesPerDay: plan.maxCoursesPerDay,
    includePractice: plan.includePractice,
    courses: rows.map(({ planCourse, course }) => ({
      slug: course.slug,
      shortTitle: course.shortTitle,
      title: course.title,
      track: course.trackSlug as PlanDto["courses"][number]["track"],
      weight: planCourse.weight,
      deadline: planCourse.deadline,
    })),
    endDate: remaining?.endDate ?? null,
    remainingSec: Number(remaining?.seconds ?? 0),
  };
}

/**
 * Parts covered by watching become done (SPEC §6.4: "Часть выполнена"). A part watched
 * ahead of its day moves to today, so history shows when it was really studied.
 */
export function markCoveredItems(
  db: AppDatabase,
  youtubeId: string,
  maxPositionSec: number,
  completed: boolean,
  today = todayIso(),
) {
  const covered = db
    .select()
    .from(planItems)
    .where(and(eq(planItems.youtubeId, youtubeId), eq(planItems.status, "planned")))
    .all()
    .filter((item) => completed || item.endSec <= maxPositionSec + 20);
  const doneAt = new Date().toISOString();
  for (const item of covered) {
    db.update(planItems)
      .set({ status: "done", doneAt, date: item.date > today ? today : item.date })
      .where(eq(planItems.id, item.id))
      .run();
  }
  return covered.length;
}

/** Manual "Часть выполнена" and its undo. */
export function setItemDone(db: AppDatabase, id: number, done: boolean, today = todayIso()) {
  const item = db.select().from(planItems).where(eq(planItems.id, id)).get();
  if (!item) return undefined;
  db.update(planItems)
    .set(
      done
        ? {
            status: "done",
            doneAt: new Date().toISOString(),
            date: item.date > today ? today : item.date,
          }
        : { status: "planned", doneAt: null },
    )
    .where(eq(planItems.id, id))
    .run();
  return db.select().from(planItems).where(eq(planItems.id, id)).get();
}

/** Adds really played seconds to today's study time (streak, statistics). */
export function addStudyTime(
  db: AppDatabase,
  youtubeId: string,
  seconds: number,
  today = todayIso(),
) {
  if (seconds <= 0) return;
  const course =
    catalog.coursesWithVideo(db, youtubeId).find((row) => row.collection === "active") ??
    catalog.coursesWithVideo(db, youtubeId)[0];
  if (!course) return;
  db.insert(studySessions)
    .values({ date: today, courseSlug: course.slug, seconds })
    .onConflictDoUpdate({
      target: [studySessions.date, studySessions.courseSlug],
      set: { seconds: sql`${studySessions.seconds} + ${seconds}` },
    })
    .run();
}

/** Days with at least 5 minutes of study or a finished part. */
export function activeDates(db: AppDatabase, from: string, to: string): Set<string> {
  const studied = db
    .select({ date: studySessions.date, seconds: sql<number>`sum(${studySessions.seconds})` })
    .from(studySessions)
    .where(and(gte(studySessions.date, from), lte(studySessions.date, to)))
    .groupBy(studySessions.date)
    .all()
    .filter((row) => Number(row.seconds) >= 300)
    .map((row) => row.date);
  const finished = db
    .selectDistinct({ date: planItems.date })
    .from(planItems)
    .where(and(eq(planItems.status, "done"), gte(planItems.date, from), lte(planItems.date, to)))
    .all()
    .map((row) => row.date);
  return new Set([...studied, ...finished]);
}
