import { describe, expect, it } from "vitest";
import { studyStreak } from "./streak";

describe("studyStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(studyStreak(new Set(["2026-11-16", "2026-11-17", "2026-11-18"]), "2026-11-18")).toBe(3);
  });

  it("keeps yesterday's streak alive before today's lesson", () => {
    expect(studyStreak(new Set(["2026-11-16", "2026-11-17"]), "2026-11-18")).toBe(2);
  });

  it("breaks on a missed day", () => {
    expect(studyStreak(new Set(["2026-11-14", "2026-11-17", "2026-11-18"]), "2026-11-18")).toBe(2);
    expect(studyStreak(new Set(["2026-11-15"]), "2026-11-18")).toBe(0);
  });
});
