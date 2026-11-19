import type { RoadmapDto, RoadmapNodeDto } from "@shared/api";
import { describe, expect, it } from "vitest";
import {
  COLUMN_GAP,
  formatHoursLeft,
  initialViewport,
  layoutRoadmap,
  missingHint,
  NODE_WIDTH,
  ROW_HEIGHT,
  splitTitle,
} from "./roadmap";

const node = (
  slug: string,
  track: RoadmapNodeDto["track"],
  order: number,
  prerequisites: RoadmapNodeDto["prerequisites"] = [],
  progress = 0,
): RoadmapNodeDto => ({
  slug,
  title: slug,
  shortTitle: slug,
  university: "MIT",
  track,
  order,
  status: "imported",
  progress,
  hours: 10,
  state: "available",
  inPlan: false,
  prerequisites,
  missing: [],
});

const track = (slug: RoadmapNodeDto["track"], order: number) => ({
  slug,
  title: slug,
  color: "#ffffff",
  order,
  description: "",
});

const roadmap: RoadmapDto = {
  hoursLeft: 12,
  tracks: [track("cv", 4), track("foundation", 1)],
  nodes: [
    node("cs50p", "foundation", 5, [{ slug: "cs50x", minProgress: 0.5, optional: false }]),
    node("cs50x", "foundation", 1, [], 0.7),
    node("linalg", "foundation", 3, [], 0.2),
    node("stat", "foundation", 7),
    node("fpcv", "cv", 1, [{ slug: "linalg", minProgress: 0.3, optional: false }]),
    node("dl-cv", "cv", 2, [
      { slug: "linalg", minProgress: 0.6, optional: false },
      { slug: "stat", minProgress: 0.3, optional: true },
    ]),
    node("cv-robots", "cv", 3, [{ slug: "dl-cv", minProgress: 0.6, optional: false }]),
  ],
};

describe("layoutRoadmap", () => {
  const { nodes, edges } = layoutRoadmap(roadmap);
  const position = (id: string) => nodes.find((item) => item.id === id)?.position;
  const edge = (id: string) => edges.find((item) => item.id === id);

  it("puts tracks in path order and courses by their order", () => {
    expect(position("track:foundation")?.x).toBe(0);
    expect(position("track:cv")?.x).toBe(NODE_WIDTH + COLUMN_GAP);
    expect(position("cs50x")).toEqual({ x: 0, y: 0 });
    expect(position("linalg")).toEqual({ x: 0, y: ROW_HEIGHT });
    expect(position("cs50p")).toEqual({ x: 0, y: 2 * ROW_HEIGHT });
  });

  it("colors arrows by whether the prerequisite is reached", () => {
    expect(edge("cs50x->cs50p")?.data?.kind).toBe("met");
    expect(edge("linalg->dl-cv")?.data?.kind).toBe("unmet");
    expect(edge("stat->dl-cv")?.data?.kind).toBe("optional");
  });

  it("runs arrows inside a column along its side", () => {
    expect(edge("cs50x->cs50p")).toMatchObject({ sourceHandle: "side-out", type: "smoothstep" });
    expect(edge("dl-cv->cv-robots")).toMatchObject({ sourceHandle: "side-out" });
    expect(edge("linalg->fpcv")).toMatchObject({ sourceHandle: "out", type: "default" });
  });

  it("ends the path in the goal, fed by the CV courses nothing builds on", () => {
    expect(position("goal")).toEqual({ x: 2 * (NODE_WIDTH + COLUMN_GAP), y: ROW_HEIGHT });
    expect(
      edges
        .filter((item) => item.target === "goal")
        .map((item) => item.source)
        .sort(),
    ).toEqual(["cv-robots", "fpcv"]);
  });
});

describe("missingHint", () => {
  it("says what to pass first and how far it is", () => {
    expect(
      missingHint([
        {
          slug: "mit-18-06",
          shortTitle: "18.06",
          minProgress: 0.6,
          progress: 0.4,
          optional: false,
        },
        { slug: "stat", shortTitle: "Stat 110", minProgress: 0.3, progress: 0, optional: true },
      ]),
    ).toEqual([
      "Рекомендуется сначала пройти 18.06 — сейчас 40% из 60%",
      "Желательно сначала пройти Stat 110 — сейчас 0% из 30%",
    ]);
  });
});

describe("formatHoursLeft", () => {
  it("rounds to whole hours with the right word", () => {
    expect(formatHoursLeft(41.6)).toBe("~42 часа");
    expect(formatHoursLeft(0.2)).toBe("~1 час");
    expect(formatHoursLeft(125)).toBe("~125 часов");
    expect(formatHoursLeft(0)).toBe("~0 часов");
  });
});

describe("initialViewport", () => {
  const { nodes } = layoutRoadmap(roadmap);
  // Two columns and the goal: 3 × 232 + 2 × 104 = 904 px wide.

  it("fits the whole width when the window is wide enough, never above 100%", () => {
    expect(initialViewport(nodes, 2000).zoom).toBe(1);
    expect(initialViewport(nodes, 904 * 0.8 + 48).zoom).toBeCloseTo(0.8);
  });

  it("stays readable on a narrow window and starts at the top left", () => {
    const viewport = initialViewport(nodes, 400);
    expect(viewport.zoom).toBe(0.6);
    expect(viewport.x).toBe(24);
    expect(viewport.y).toBeCloseTo(24 + 84 * 0.6);
  });
});

describe("splitTitle", () => {
  it("says the course code once", () => {
    expect(splitTitle("CS50x", "CS50x: Introduction to CS")).toEqual({
      lead: "CS50x",
      rest: ": Introduction to CS",
    });
    expect(splitTitle("18.06", "18.06SC Linear Algebra")).toEqual({
      lead: "18.06SC",
      rest: " Linear Algebra",
    });
    expect(splitTitle("18.06", "Linear Algebra")).toEqual({
      lead: "18.06",
      rest: " · Linear Algebra",
    });
  });
});
