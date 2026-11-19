import type { StatsDto } from "@shared/api";
import type { Subject, TrackSlug } from "@shared/catalog";
import { todayIso } from "@shared/dates";
import { bestStreak, periodRange, shiftPeriod, studyTotals, type StatsPeriod } from "@shared/stats";
import { studyStreak } from "@shared/streak";
import { and, gte, lte, sql } from "drizzle-orm";
import { getCatalog } from "../catalog/catalog-service";
import type { AppDatabase } from "../db/client";
import { noteLinks, notes, studySessions } from "../db/schema";
import { activeDates } from "../plan/plan-service";
import { cvProgress } from "../plan/plan-views";

function noteCounts(db: AppDatabase): StatsDto["notes"] {
  const count =
    db
      .select({ n: sql<number>`count(*)` })
      .from(notes)
      .get()?.n ?? 0;
  const links = db
    .select({ kind: noteLinks.kind, n: sql<number>`count(*)` })
    .from(noteLinks)
    .groupBy(noteLinks.kind)
    .all();
  const of = (kinds: string[]) =>
    links.filter((row) => kinds.includes(row.kind)).reduce((sum, row) => sum + row.n, 0);
  return { count, links: of(["wikilink", "embed"]), timecodes: of(["video"]) };
}

/** Statistics of a week or a month (SPEC §6.7). */
export function getStats(
  db: AppDatabase,
  period: StatsPeriod,
  anchor: string,
  options: { today?: string; vaultConnected?: boolean } = {},
): StatsDto {
  const today = options.today ?? todayIso();
  const { from, to } = periodRange(period, anchor);
  const catalog = getCatalog(db);
  const info = new Map(
    catalog.courses.map((course) => [
      course.slug,
      { track: course.track, subject: course.subject },
    ]),
  );
  const rows = db
    .select()
    .from(studySessions)
    .where(and(gte(studySessions.date, from), lte(studySessions.date, to)))
    .all();
  const totals = studyTotals(rows, info, from, to);

  const allActive = activeDates(db, "0000-01-01", today);
  const next = shiftPeriod(period, anchor, 1);

  return {
    period,
    from,
    to,
    previous: shiftPeriod(period, anchor, -1),
    next: next > today ? null : next,
    total: totals.total,
    activeDays: [...allActive].filter((date) => date >= from && date <= to).length,
    days: totals.days,
    byTrack: catalog.tracks.map((track) => ({
      slug: track.slug,
      title: track.title,
      color: track.color,
      seconds: totals.byTrack[track.slug] ?? 0,
    })),
    bySubject: (Object.entries(totals.bySubject) as [Subject, number][])
      .map(([subject, seconds]) => ({ subject, seconds }))
      .sort((a, b) => b.seconds - a.seconds),
    courses: catalog.courses
      .filter((course) => course.progress > 0 || (totals.byCourse[course.slug] ?? 0) > 0)
      .map((course) => ({
        slug: course.slug,
        shortTitle: course.shortTitle,
        title: course.title,
        track: course.track as TrackSlug,
        progress: course.progress,
        seconds: totals.byCourse[course.slug] ?? 0,
      }))
      .sort((a, b) => b.seconds - a.seconds || b.progress - a.progress),
    streak: { current: studyStreak(allActive, today), best: bestStreak(allActive) },
    notes: options.vaultConnected === false ? null : noteCounts(db),
    cv: cvProgress(db),
  };
}
