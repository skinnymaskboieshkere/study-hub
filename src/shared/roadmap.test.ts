import { describe, expect, it } from "vitest";
import {
  computeRoadmapState,
  hoursToComputerVision,
  requiredShares,
  trackShares,
  type RoadmapCourse,
} from "./roadmap";

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

describe("computeRoadmapState", () => {
  const withProgress = (progress: Record<string, number>) =>
    catalog.map((item) => ({ ...item, progress: progress[item.slug] ?? 0 }));

  it("gives courses without prerequisites as available and the rest as wait", () => {
    const { nodes } = computeRoadmapState(catalog);
    expect(nodes.get("cs50x")?.state).toBe("available");
    expect(nodes.get("cs50p")?.state).toBe("wait");
    expect(nodes.get("cs50p")?.missing).toEqual([
      { course: "cs50x", minProgress: 0.5, progress: 0, optional: false },
    ]);
  });

  it("opens a course once every required prerequisite reaches its share (SPEC §6.3 acceptance)", () => {
    const before = computeRoadmapState(withProgress({ cs50p: 0.8, calc: 0.8, linalg: 0.4 }));
    expect(before.nodes.get("dl-cv")?.state).toBe("wait");
    expect(before.nodes.get("dl-cv")?.missing.map((item) => item.course)).toEqual(["linalg"]);

    const after = computeRoadmapState(withProgress({ cs50p: 0.8, calc: 0.8, linalg: 0.6 }));
    expect(after.nodes.get("dl-cv")?.state).toBe("available");
    expect(after.hoursLeft).toBeLessThan(before.hoursLeft);
  });

  it("does not hold a course back for a desirable prerequisite, but names it", () => {
    const courses = [
      course("stat", "engineering", 27),
      course("dl", "cv", 26, [{ course: "stat", minProgress: 0.3, optional: true }]),
    ];
    const node = computeRoadmapState(courses).nodes.get("dl");
    expect(node?.state).toBe("available");
    expect(node?.missing).toEqual([
      { course: "stat", minProgress: 0.3, progress: 0, optional: true },
    ]);
  });

  it("puts required gaps before desirable ones", () => {
    const courses = [
      course("a", "foundation", 1),
      course("b", "foundation", 1),
      course("c", "cv", 1, [
        { course: "a", minProgress: 0.3, optional: true },
        { course: "b", minProgress: 0.5 },
      ]),
    ];
    const missing = computeRoadmapState(courses).nodes.get("c")?.missing ?? [];
    expect(missing.map((item) => item.course)).toEqual(["b", "a"]);
  });

  it("marks started courses in progress and finished ones done", () => {
    const { nodes } = computeRoadmapState([
      ...withProgress({ cs50p: 0.2, cs50x: 0.995 }),
      { ...course("calc2", "engineering", 28), completed: true },
    ]);
    expect(nodes.get("cs50p")?.state).toBe("in-progress");
    expect(nodes.get("cs50x")?.state).toBe("done");
    expect(nodes.get("calc2")?.state).toBe("done");
  });
});
