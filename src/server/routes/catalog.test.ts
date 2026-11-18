import path from "node:path";
import type { CatalogDto, CourseDetailDto, ProgressDto, WatchDto } from "@shared/api";
import type { SeedCourse } from "@shared/catalog";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import { applySeed } from "../catalog/seed";
import { openDatabase } from "../db/client";
import type { YouTubeClient } from "../youtube/client";

const video = (youtubeId: string, title: string, kind = "lecture", durationSec = 1000) => ({
  youtubeId,
  title,
  durationSec,
  kind,
  language: "en",
  embeddable: true,
});

const baseCourse = {
  university: "MIT",
  instructors: ["Gilbert Strang"],
  subject: "math",
  level: 1,
  description: "Описание",
  sourceUrl: "https://ocw.mit.edu/",
  license: "CC BY-NC-SA 4.0",
  verifiedAt: "2026-11-18",
  youtubePlaylistIds: [],
  materials: [],
  skills: [],
};

const seed = {
  hash: "test",
  tracks: {
    tracks: [
      { slug: "foundation", title: "Фундамент", color: "#a78bfa", order: 1, description: "-" },
    ],
    courses: [
      {
        course: "algebra",
        track: "foundation",
        order: 1,
        prerequisites: [],
        initialCollection: "wishlist",
      },
      {
        course: "robots",
        track: "foundation",
        order: 2,
        prerequisites: [{ course: "algebra", minProgress: 0.5 }],
      },
    ],
  },
  courses: [
    {
      ...baseCourse,
      slug: "algebra",
      title: "Linear Algebra",
      shortTitle: "18.06",
      status: "imported",
      units: [
        { title: "Intro", videos: [video("intro000001", "О курсе", "short", 60)] },
        {
          title: "Geometry",
          videos: [
            video("lecture0001", "Лекция 1"),
            video("problem0001", "Разбор", "problem-solving", 500),
          ],
        },
        { title: "Elimination", videos: [video("lecture0002", "Лекция 2")] },
      ],
    },
    {
      ...baseCourse,
      slug: "robots",
      title: "Robots",
      shortTitle: "Robots",
      status: "candidate",
      youtubePlaylistIds: ["PLrobots"],
      units: [],
    },
  ] as SeedCourse[],
} as unknown as Parameters<typeof applySeed>[1];

describe("catalog and progress API", () => {
  let database: ReturnType<typeof openDatabase>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    applySeed(database.db, seed);
    app = await buildApp({ db: database.db });
  });

  afterEach(async () => {
    await app.close();
    database.close();
  });

  const get = async <T>(url: string) => (await app.inject({ method: "GET", url })).json<T>();

  it("lists the catalog with collections, covers and lengths", async () => {
    const catalog = await get<CatalogDto>("/api/catalog");
    const algebra = catalog.courses.find((course) => course.slug === "algebra");

    expect(catalog.tracks.map((track) => track.slug)).toEqual(["foundation"]);
    expect(algebra).toMatchObject({
      collection: "wishlist",
      coverVideoId: "lecture0001",
      lessonsTotal: 3,
      totalSeconds: 2500,
      progress: 0,
    });
  });

  it("saves the position, resumes from it and moves the course into «В процессе»", async () => {
    const saved = await app.inject({
      method: "PUT",
      url: "/api/progress/lecture0001",
      payload: { positionSec: 180 },
    });
    expect(saved.json<ProgressDto>()).toMatchObject({ positionSec: 180, completed: false });

    const watch = await get<WatchDto>("/api/watch/lecture0001");
    expect(watch.video.resumeSec).toBe(180);
    expect(watch.nextYoutubeId).toBe("problem0001");

    const course = await get<CourseDetailDto>("/api/courses/algebra");
    expect(course.collection).toBe("active");
    expect(course.progress).toBeCloseTo(180 / 2500);
  });

  it("marks a video watched at 90% and lets the user undo it", async () => {
    await app.inject({
      method: "PUT",
      url: "/api/progress/lecture0001",
      payload: { positionSec: 950 },
    });
    let course = await get<CourseDetailDto>("/api/courses/algebra");
    expect(course.units[1]?.lessons[0]?.status).toBe("done");
    expect(course.nextYoutubeId).toBe("problem0001");

    await app.inject({
      method: "POST",
      url: "/api/progress/lecture0001/complete",
      payload: { completed: false },
    });
    course = await get<CourseDetailDto>("/api/courses/algebra");
    expect(course.units[1]?.lessons[0]?.status).toBe("partial");
  });

  it("accepts progress sent with sendBeacon (POST)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/progress/lecture0002",
      payload: { positionSec: 42 },
    });
    expect(response.statusCode).toBe(200);
  });

  it("rejects bad input and unknown videos", async () => {
    const bad = await app.inject({
      method: "PUT",
      url: "/api/progress/lecture0001",
      payload: { positionSec: -1 },
    });
    const unknown = await app.inject({
      method: "PUT",
      url: "/api/progress/nope0000000",
      payload: { positionSec: 1 },
    });
    expect(bad.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(404);
  });

  it("shows unmet prerequisites", async () => {
    const robots = await get<CourseDetailDto>("/api/courses/robots");
    expect(robots.prerequisites).toEqual([
      expect.objectContaining({ slug: "algebra", minProgress: 0.5, progress: 0, met: false }),
    ]);
    expect(robots.canImport).toBe(true);
  });

  it("moves a course between collections", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/courses/algebra",
      payload: { collection: "archived" },
    });
    expect(response.json<CourseDetailDto>().collection).toBe("archived");
  });

  it("adds, lists and deletes bookmarks", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/videos/lecture0001/bookmarks",
      payload: { tSec: 754, label: "Определение" },
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json<{ id: number }>();

    expect(await get<unknown[]>("/api/videos/lecture0001/bookmarks")).toHaveLength(1);
    expect((await app.inject({ method: "DELETE", url: `/api/bookmarks/${id}` })).statusCode).toBe(
      204,
    );
    expect(await get<unknown[]>("/api/videos/lecture0001/bookmarks")).toHaveLength(0);
  });

  it("suggests what to continue on the home page", async () => {
    expect((await get<{ item: unknown }>("/api/continue")).item).toBeNull();
    await app.inject({
      method: "PUT",
      url: "/api/progress/lecture0001",
      payload: { positionSec: 120 },
    });
    const { item } = await get<{ item: { lesson: { youtubeId: string } } }>("/api/continue");
    expect(item.lesson.youtubeId).toBe("lecture0001");
  });

  it("imports a candidate's playlist from the app", async () => {
    const youtube = {
      listPlaylistItems: vi
        .fn()
        .mockResolvedValue([
          { videoId: "robotvideo1", title: "Lecture 1 | Robots", position: 0, available: true },
        ]),
      getVideos: vi.fn().mockResolvedValue([
        {
          id: "robotvideo1",
          title: "Lecture 1 | Robots",
          channelId: "UC",
          channelTitle: "Stanford",
          durationSec: 3000,
          embeddable: true,
          privacy: "public",
          hasCaptions: true,
          description: "",
        },
      ]),
    } as unknown as YouTubeClient;
    await app.close();
    app = await buildApp({ db: database.db, youtube });

    const response = await app.inject({ method: "POST", url: "/api/courses/robots/import" });
    const course = response.json<CourseDetailDto>();
    expect(course.status).toBe("imported");
    expect(course.units[0]?.lessons).toHaveLength(1);
  });

  it("explains that importing needs the API key", async () => {
    const response = await app.inject({ method: "POST", url: "/api/courses/robots/import" });
    expect(response.statusCode).toBe(503);
  });
});
