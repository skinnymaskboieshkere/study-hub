import { describe, expect, it } from "vitest";
import { hoursToComputerVision, requiredShares, trackShares, type RoadmapCourse } from "./roadmap";

const course = (
  slug: string,
  track: RoadmapCourse["track"],
  hours: number,
  prerequisites: RoadmapCourse["prerequisites"] = [],
  progress = 0,
): RoadmapCourse => ({ slug, track, hours, progress, prerequisites });

const catalog = [
  course("cs50x", "foundation", 30),
  course("cs50p", "foundation", 16, [{ course: "cs50x", minProgress: 0.5 }]),
  course("linalg", "foundation", 35),
  course("calc", "foundation", 40),
  course("robots", "robotics", 20, [{ course: "linalg", minProgress: 0.6 }]),
  course("fpcv", "cv", 20, [{ course: "calc", minProgress: 0.6 }]),
  course("dl-cv", "cv", 26, [
    { course: "cs50p", minProgress: 0.8 },
    { course: "linalg", minProgress: 0.6 },
    { course: "calc", minProgress: 0.8 },
  ]),
  course("cv-robots", "cv", 6, [
    { course: "dl-cv", minProgress: 0.6 },
    { course: "robots", minProgress: 0.3 },
  ]),
];

describe("requiredShares", () => {
  it("follows prerequisites back from the first CV courses and keeps the highest share", () => {
    expect(Object.fromEntries(requiredShares(catalog))).toEqual({
      calc: 0.8,
      cs50p: 0.8,
      cs50x: 0.5,
      linalg: 0.6,
    });
  });

  it("ignores what later CV courses need (robots is not on the way into the track)", () => {
    expect(requiredShares(catalog).has("robots")).toBe(false);
  });
});

describe("hoursToComputerVision", () => {
  it("adds up the remaining required hours", () => {
    // calc 0.8×40 + cs50p 0.8×16 + cs50x 0.5×30 + linalg 0.6×35
    expect(hoursToComputerVision(catalog)).toBeCloseTo(32 + 12.8 + 15 + 21);
  });

  it("shrinks with progress and stops at zero", () => {
    const studied = catalog.map((item) =>
      item.slug === "linalg"
        ? { ...item, progress: 0.6 }
        : item.slug === "calc"
          ? { ...item, progress: 1 }
          : item,
    );
    expect(hoursToComputerVision(studied)).toBeCloseTo(12.8 + 15);
  });
});

describe("trackShares", () => {
  it("weights progress by course length", () => {
    const shares = trackShares([
      course("a", "foundation", 30, [], 1),
      course("b", "foundation", 10, [], 0),
      course("c", "cv", 20, [], 0.5),
    ]);
    expect(shares).toEqual({ foundation: 0.75, engineering: 0, robotics: 0, cv: 0.5 });
  });
});
