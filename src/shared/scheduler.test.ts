import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  type ScheduleCourse,
  type ScheduledPart,
  type ScheduleInput,
} from "./scheduler";

const MONDAY = "2026-11-16";
const WEEKDAYS = [1, 2, 3, 4, 5];

/** A course whose videos have the given lengths in minutes. */
function course(
  slug: string,
  minutes: number[],
  extra: Partial<ScheduleCourse> = {},
): ScheduleCourse {
  return {
    slug,
    weight: 1,
    videos: minutes.map((length, index) => ({
      youtubeId: `${slug}-${index}`.padEnd(11, "x"),
      durationSec: length * 60,
      fromSec: 0,
    })),
    ...extra,
  };
}

function plan(courses: ScheduleCourse[], extra: Partial<ScheduleInput> = {}) {
  return buildSchedule({
    startDate: MONDAY,
    studyWeekdays: WEEKDAYS,
    minutesPerDay: 60,
    maxCoursesPerDay: 2,
    courses,
    ...extra,
  });
}

function minutesByDay(parts: ScheduledPart[]) {
  const totals = new Map<string, number>();
  for (const part of parts) {
    totals.set(part.date, (totals.get(part.date) ?? 0) + (part.endSec - part.startSec) / 60);
  }
  return totals;
}

const coursesOnDay = (parts: ScheduledPart[], date: string) => [
  ...new Set(parts.filter((p) => p.date === date).map((p) => p.courseSlug)),
];

describe("buildSchedule", () => {
  it("returns nothing without courses or study days", () => {
    expect(plan([])).toEqual([]);
    expect(plan([course("a", [30])], { studyWeekdays: [] })).toEqual([]);
  });

  it("keeps the program order and covers every video fully", () => {
    const parts = plan([course("a", [20, 20, 20])], { maxCoursesPerDay: 1 });
    expect(parts.map((p) => [p.date, p.youtubeId, p.startSec, p.endSec])).toEqual([
      [MONDAY, "a-0xxxxxxxx", 0, 1200],
      [MONDAY, "a-1xxxxxxxx", 0, 1200],
      [MONDAY, "a-2xxxxxxxx", 0, 1200],
    ]);
  });

  it("cuts a long video into parts of at least 10 minutes without gaps", () => {
    const parts = plan([course("a", [120])], { minutesPerDay: 45, maxCoursesPerDay: 1 });
    expect(parts.map((p) => [p.startSec, p.endSec])).toEqual([
      [0, 2700],
      [2700, 5400],
      [5400, 7200],
    ]);
    expect(parts.every((p) => p.endSec - p.startSec >= 600)).toBe(true);
  });

  it("never leaves a tail shorter than 10 minutes", () => {
    const parts = plan([course("a", [50])], { minutesPerDay: 45, maxCoursesPerDay: 1 });
    expect(parts).toEqual([expect.objectContaining({ date: MONDAY, startSec: 0, endSec: 3000 })]);
  });

  it("continues a partly watched video from where it stopped", () => {
    const partly = course("a", [30]);
    partly.videos[0]!.fromSec = 600;
    expect(plan([partly])).toEqual([expect.objectContaining({ startSec: 600, endSec: 1800 })]);
  });

  it("does not plan videos that are already watched to the end", () => {
    const watched = course("a", [30, 30]);
    watched.videos[0]!.fromSec = 1800;
    expect(plan([watched]).map((p) => p.youtubeId)).toEqual(["a-1xxxxxxxx"]);
  });

  it("uses only study weekdays and skips days off", () => {
    const parts = plan([course("a", Array(4).fill(60))], {
      studyWeekdays: [1, 3, 5],
      daysOff: ["2026-11-18"],
      maxCoursesPerDay: 1,
    });
    expect(parts.map((p) => p.date)).toEqual([
      "2026-11-16",
      "2026-11-20",
      "2026-11-23",
      "2026-11-25",
    ]);
  });

  it("stays within the daily budget (a short tail may add under 10 minutes)", () => {
    const parts = plan([course("a", [47, 33, 95, 12]), course("b", [81, 22, 64])]);
    for (const minutes of minutesByDay(parts).values()) expect(minutes).toBeLessThan(70);
  });

  it("takes turns: two of four subjects a day", () => {
    const four = ["a", "b", "c", "d"].map((slug) => course(slug, Array(6).fill(30)));
    const parts = plan(four);
    expect(coursesOnDay(parts, "2026-11-16")).toEqual(["a", "b"]);
    expect(coursesOnDay(parts, "2026-11-17")).toEqual(["c", "d"]);
    expect(coursesOnDay(parts, "2026-11-18")).toEqual(["a", "b"]);
  });

  it("gives more days to a higher priority", () => {
    const parts = plan(
      [course("high", Array(10).fill(60), { weight: 2 }), course("normal", Array(10).fill(60))],
      { maxCoursesPerDay: 1 },
    );
    const firstSixDays = [...new Set(parts.map((p) => p.date))].slice(0, 6);
    const highDays = firstSixDays.filter((date) => coursesOnDay(parts, date).includes("high"));
    expect(highDays).toHaveLength(4);
  });

  it("studies one subject a day when the day is shorter than two blocks", () => {
    const parts = plan([course("a", Array(5).fill(45)), course("b", Array(5).fill(45))], {
      minutesPerDay: 45,
    });
    for (const date of new Set(parts.map((p) => p.date))) {
      expect(coursesOnDay(parts, date)).toHaveLength(1);
    }
  });

  it("gives every day to a course whose deadline needs it", () => {
    // 600 minutes of work in 10 study days at 60 minutes a day: no room for anything else.
    const parts = plan(
      [
        course("relaxed", Array(10).fill(30)),
        course("exam", Array(20).fill(30), { deadline: "2026-11-27" }),
      ],
      { maxCoursesPerDay: 1 },
    );
    const firstWeek = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"];
    for (const date of firstWeek) expect(coursesOnDay(parts, date)).toEqual(["exam"]);
    expect(parts.filter((p) => p.courseSlug === "exam").every((p) => p.date <= "2026-11-27")).toBe(
      true,
    );
  });

  it("finishes before a relaxed deadline and still takes turns", () => {
    const parts = plan(
      [
        course("relaxed", Array(10).fill(30)),
        course("exam", Array(10).fill(30), { deadline: "2026-11-27" }),
      ],
      { maxCoursesPerDay: 1 },
    );
    const examDates = parts.filter((p) => p.courseSlug === "exam").map((p) => p.date);
    expect(examDates.every((date) => date <= "2026-11-27")).toBe(true);
    const firstWeek = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"];
    expect(firstWeek.some((date) => coursesOnDay(parts, date).includes("relaxed"))).toBe(true);
  });

  it("subtracts what was already studied on the start day", () => {
    const parts = plan([course("a", Array(4).fill(15))], { usedOnStartSec: 45 * 60 });
    expect(minutesByDay(parts).get(MONDAY)).toBe(15);
  });

  it("supports lighter days of the week", () => {
    const parts = plan([course("a", Array(10).fill(15))], {
      studyWeekdays: [5, 6],
      minutesByWeekday: { 6: 30 },
      maxCoursesPerDay: 1,
    });
    expect(minutesByDay(parts).get("2026-11-20")).toBe(60);
    expect(minutesByDay(parts).get("2026-11-21")).toBe(30);
  });

  it("starts with the subjects that got the least time so far (daily re-planning)", () => {
    const parts = plan([
      course("a", Array(6).fill(30), { studiedSec: 3600 }),
      course("b", Array(6).fill(30), { studiedSec: 3600 }),
      course("c", Array(6).fill(30)),
      course("d", Array(6).fill(30)),
    ]);
    expect(coursesOnDay(parts, MONDAY)).toEqual(["c", "d"]);
  });

  it("stops at the planning horizon even with endless work", () => {
    const parts = plan([course("a", Array(1000).fill(60))], { maxDays: 14, maxCoursesPerDay: 1 });
    expect(new Set(parts.map((p) => p.date)).size).toBe(10);
  });
});
