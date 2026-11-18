import { describe, expect, it } from "vitest";
import { formatMonthTitle, formatWeekTitle, monthRange, shiftAnchor, weekRange } from "./calendar";

describe("weekRange", () => {
  it("runs from Monday to Sunday", () => {
    expect(weekRange("2026-11-18")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
    expect(weekRange("2026-11-22")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
  });
});

describe("monthRange", () => {
  it("covers the month with whole weeks", () => {
    // November 2026: Sunday the 1st, Monday the 30th.
    expect(monthRange("2026-11-18")).toEqual({ from: "2026-10-26", to: "2026-12-06" });
  });

  it("handles a month that starts on Monday and February", () => {
    // February 2027 starts on Monday and ends on Sunday: exactly four weeks.
    expect(monthRange("2027-02-10")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });
});

describe("shiftAnchor", () => {
  it("moves a week by seven days", () => {
    expect(shiftAnchor("week", "2026-11-18", 1)).toBe("2026-11-25");
    expect(shiftAnchor("week", "2026-11-18", -1)).toBe("2026-11-11");
  });

  it("moves a month to the first day of the next or previous one", () => {
    expect(shiftAnchor("month", "2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftAnchor("month", "2027-01-31", -1)).toBe("2026-12-01");
  });
});

describe("titles", () => {
  it("names a week inside one month and across two", () => {
    expect(formatWeekTitle({ from: "2026-11-16", to: "2026-11-22" })).toBe("16–22 ноября 2026");
    expect(formatWeekTitle({ from: "2026-11-30", to: "2026-12-06" })).toBe(
      "30 ноября – 6 декабря 2026",
    );
    expect(formatWeekTitle({ from: "2026-12-28", to: "2027-01-03" })).toBe(
      "28 декабря 2026 – 3 января 2027",
    );
  });

  it("names a month", () => {
    expect(formatMonthTitle("2026-11-18")).toBe("Ноябрь 2026");
  });
});
