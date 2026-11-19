import { describe, expect, it } from "vitest";
import { dayLabel, longDay, minuteTicks, periodTitle } from "./stats";

describe("minuteTicks", () => {
  it("covers the maximum with about four clean steps", () => {
    expect(minuteTicks(0)).toEqual([0, 15, 30, 45, 60]);
    expect(minuteTicks(95)).toEqual([0, 30, 60, 90, 120]);
    expect(minuteTicks(200)).toEqual([0, 60, 120, 180, 240]);
  });
});

describe("labels", () => {
  it("names days and periods in Russian", () => {
    expect(dayLabel("week", "2026-11-16")).toBe("пн");
    expect(dayLabel("month", "2026-11-09")).toBe("9");
    expect(periodTitle("week", "2026-11-16", "2026-11-22")).toBe("16–22 ноября");
    expect(periodTitle("week", "2026-10-26", "2026-11-01")).toBe("26 октября – 1 ноября");
    expect(periodTitle("month", "2026-11-01", "2026-11-30")).toBe("ноябрь 2026");
    expect(longDay("2026-11-19")).toBe("чт, 19 ноября");
  });
});
