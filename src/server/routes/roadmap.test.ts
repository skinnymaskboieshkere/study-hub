import path from "node:path";
import type { RoadmapDto } from "@shared/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { applySeed } from "../catalog/seed";
import { openDatabase } from "../db/client";

const base = {
  university: "MIT",
  instructors: ["Someone"],
  subject: "math",
  level: 1,
  description: "-",
  sourceUrl: "https://ocw.mit.edu/",
  license: "CC BY-NC-SA 4.0",
  verifiedAt: "2026-11-19",
  youtubePlaylistIds: [],
  materials: [],
  skills: [],
};

/** Ten one-hour lectures. */
const linalg = {
  ...base,
  slug: "linalg",
  title: "Linear Algebra",
  shortTitle: "18.06",
  status: "imported",
  units: [
    {
      title: "Unit",
      videos: Array.from({ length: 10 }, (_, index) => ({
        youtubeId: `linalg${index}`.padEnd(11, "0"),
        title: `Lecture ${index + 1}`,
        durationSec: 3600,
        kind: "lecture",
        language: "en",
        embeddable: true,
      })),
    },
  ],
};

const candidate = (slug: string, shortTitle: string, estimatedHours: number) => ({
  ...base,
  slug,
  title: slug,
  shortTitle,
  status: "candidate",
  estimatedHours,
  units: [],
});

const seed = {
  hash: "roadmap-test",
  tracks: {
    tracks: [
      { slug: "foundation", title: "Фундамент", color: "#a78bfa", order: 1, description: "-" },
      {
        slug: "engineering",
        title: "Инженерная база",
        color: "#60a5fa",
        order: 2,
        description: "-",
      },
      { slug: "cv", title: "Computer Vision", color: "#22d3ee", order: 4, description: "-" },
    ],
    courses: [
      { course: "linalg", track: "foundation", order: 1, prerequisites: [] },
      { course: "stat", track: "engineering", order: 1, prerequisites: [] },
      {
        course: "dl-cv",
        track: "cv",
        order: 1,
        prerequisites: [
          { course: "linalg", minProgress: 0.6 },
          { course: "stat", minProgress: 0.3, optional: true },
        ],
      },
    ],
  },
  courses: [linalg, candidate("stat", "Stat 110", 27), candidate("dl-cv", "EECS 498", 26)],
} as unknown as Parameters<typeof applySeed>[1];

describe("roadmap API", () => {
  let database: ReturnType<typeof openDatabase>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const roadmap = async () =>
    (await app.inject({ method: "GET", url: "/api/roadmap" })).json<RoadmapDto>();
  const node = (view: RoadmapDto, slug: string) => view.nodes.find((item) => item.slug === slug);

  beforeEach(async () => {
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    applySeed(database.db, seed);
    app = await buildApp({ db: database.db });
  });

  afterEach(async () => {
    await app.close();
    database.close();
  });

  it("opens the CV course once 60% of linear algebra is watched (SPEC §6.3 acceptance)", async () => {
    const before = await roadmap();
    expect(node(before, "linalg")?.state).toBe("available");
    expect(node(before, "dl-cv")?.state).toBe("wait");
    expect(node(before, "dl-cv")?.missing).toEqual([
      { slug: "linalg", shortTitle: "18.06", minProgress: 0.6, progress: 0, optional: false },
      { slug: "stat", shortTitle: "Stat 110", minProgress: 0.3, progress: 0, optional: true },
    ]);
    // 60% of 10 h of linear algebra + 30% of 27 h of Stat 110.
    expect(before.hoursLeft).toBeCloseTo(6 + 8.1);

    for (let index = 0; index < 6; index++) {
      await app.inject({
        method: "POST",
        url: `/api/progress/${`linalg${index}`.padEnd(11, "0")}/complete`,
        payload: { completed: true },
      });
    }

    const after = await roadmap();
    expect(node(after, "linalg")).toMatchObject({ state: "in-progress", progress: 0.6 });
    // Stat 110 is only "желательно": it stays in the hint but does not hold the course back.
    expect(node(after, "dl-cv")).toMatchObject({
      state: "available",
      missing: [{ slug: "stat", optional: true }],
    });
    expect(after.hoursLeft).toBeCloseTo(8.1);
  });

  it("sends the arrows, course lengths and tracks", async () => {
    const view = await roadmap();
    expect(view.tracks.map((track) => track.slug)).toEqual(["foundation", "engineering", "cv"]);
    expect(node(view, "linalg")).toMatchObject({ hours: 10, status: "imported", inPlan: false });
    expect(node(view, "stat")).toMatchObject({ hours: 27, status: "candidate" });
    expect(node(view, "dl-cv")?.prerequisites).toEqual([
      { slug: "linalg", minProgress: 0.6, optional: false },
      { slug: "stat", minProgress: 0.3, optional: true },
    ]);
  });
});
