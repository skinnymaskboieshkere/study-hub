import { describe, expect, it } from "vitest";
import { bestStreak, periodRange, shiftPeriod, studyTotals, type CourseInfo } from "./stats";

describe("periodRange", () => {
  it("gives the Monday–Sunday week of a date", () => {
    expect(periodRange("week", "2026-11-19")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
  });

  it("gives the calendar month, February included", () => {
    expect(periodRange("month", "2026-11-19")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(periodRange("month", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("shiftPeriod", () => {
  it("steps by weeks and months, across a year", () => {
    expect(shiftPeriod("week", "2026-11-19", -1)).toBe("2026-11-09");
    expect(shiftPeriod("month", "2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftPeriod("month", "2026-03-31", -1)).toBe("2026-02-01");
  });
});

describe("studyTotals", () => {
  const courses = new Map<string, CourseInfo>([
    ["calc", { track: "foundation", subject: "math" }],
    ["cs50p", { track: "foundation", subject: "programming" }],
    ["robots", { track: "robotics", subject: "engineering" }],
  ]);

  it("sums by day, track, subject and course inside the period only", () => {
    const totals = studyTotals(
      [
        { date: "2026-11-16", courseSlug: "calc", seconds: 1800 },
        { date: "2026-11-16", courseSlug: "robots", seconds: 600 },
        { date: "2026-11-18", courseSlug: "cs50p", seconds: 1200 },
        { date: "2026-11-15", courseSlug: "calc", seconds: 999 },
        { date: "2026-11-17", courseSlug: "unknown", seconds: 50 },
      ],
      courses,
      "2026-11-16",
      "2026-11-22",
    );
    expect(totals.total).toBe(3600);
    expect(totals.days).toHaveLength(7);
    expect(totals.days[0]).toEqual({
      date: "2026-11-16",
      seconds: 2400,
      byTrack: { foundation: 1800, robotics: 600 },
    });
    expect(totals.days[1]?.seconds).toBe(0);
    expect(totals.byTrack).toEqual({ foundation: 3000, robotics: 600 });
    expect(totals.bySubject).toEqual({ math: 1800, programming: 1200, engineering: 600 });
    expect(totals.byCourse).toEqual({ calc: 1800, robots: 600, cs50p: 1200 });
  });
});

describe("bestStreak", () => {
  it("finds the longest run of days in a row", () => {
    expect(bestStreak([])).toBe(0);
    expect(bestStreak(["2026-11-01", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-07"])).toBe(
      3,
    );
    expect(bestStreak(["2026-10-31", "2026-11-01", "2026-11-01"])).toBe(2);
  });
});
