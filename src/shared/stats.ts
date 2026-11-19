import type { Subject, TrackSlug } from "./catalog";
import { addDays, daysBetween, fromIsoDate, startOfWeek, toIsoDate } from "./dates";

export type StatsPeriod = "week" | "month";

/** The calendar week (Monday–Sunday) or month that contains `anchor` (SPEC §6.7). */
export function periodRange(period: StatsPeriod, anchor: string): { from: string; to: string } {
  if (period === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  const date = fromIsoDate(anchor);
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

/** The same kind of period one step back or forward. */
export function shiftPeriod(period: StatsPeriod, anchor: string, step: number): string {
  if (period === "week") return addDays(startOfWeek(anchor), 7 * step);
  const date = fromIsoDate(anchor);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + step, 1, 12));
}

export interface SessionRow {
  date: string;
  courseSlug: string;
  seconds: number;
}

export interface CourseInfo {
  track: TrackSlug;
  subject: Subject;
}

export interface StudyTotals {
  /** Every day of the period, with seconds per track. */
  days: { date: string; seconds: number; byTrack: Partial<Record<TrackSlug, number>> }[];
  byTrack: Partial<Record<TrackSlug, number>>;
  bySubject: Partial<Record<Subject, number>>;
  byCourse: Record<string, number>;
  total: number;
}

const add = <K extends string>(record: Partial<Record<K, number>>, key: K, value: number) => {
  record[key] = (record[key] ?? 0) + value;
};

/** Sums study time of a period by day, track, subject and course. */
export function studyTotals(
  rows: SessionRow[],
  courses: Map<string, CourseInfo>,
  from: string,
  to: string,
): StudyTotals {
  const length = daysBetween(from, to) + 1;
  const days: StudyTotals["days"] = Array.from({ length }, (_, index) => ({
    date: addDays(from, index),
    seconds: 0,
    byTrack: {},
  }));
  const totals: StudyTotals = { days, byTrack: {}, bySubject: {}, byCourse: {}, total: 0 };
  for (const row of rows) {
    if (row.date < from || row.date > to || row.seconds <= 0) continue;
    const course = courses.get(row.courseSlug);
    const day = days[daysBetween(from, row.date)];
    if (!course || !day) continue;
    day.seconds += row.seconds;
    add(day.byTrack, course.track, row.seconds);
    add(totals.byTrack, course.track, row.seconds);
    add(totals.bySubject, course.subject, row.seconds);
    totals.byCourse[row.courseSlug] = (totals.byCourse[row.courseSlug] ?? 0) + row.seconds;
    totals.total += row.seconds;
  }
  return totals;
}

/** The longest run of consecutive study days. */
export function bestStreak(activeDates: Iterable<string>): number {
  const sorted = [...new Set(activeDates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}
