import path from "node:path";
import type { PlanDto, TaskDto, TodayDto } from "@shared/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { applySeed } from "../catalog/seed";
import { openDatabase } from "../db/client";

const MONDAY = "2026-11-16";

/** A course of `count` 30-minute lectures. */
function course(slug: string, count: number) {
  return {
    slug,
    title: slug,
    shortTitle: slug,
    university: "MIT",
    instructors: ["Someone"],
    subject: "math",
    level: 1,
    description: "-",
    sourceUrl: "https://ocw.mit.edu/",
    license: "CC BY-NC-SA 4.0",
    verifiedAt: "2026-11-18",
    status: "imported",
    youtubePlaylistIds: [],
    materials: [],
    skills: [],
    units: [
      {
        title: "Unit",
        videos: Array.from({ length: count }, (_, index) => ({
          youtubeId: `${slug}${index}`.padEnd(11, "0"),
          title: `${slug} ${index + 1}`,
          durationSec: 1800,
          kind: "lecture",
          language: "en",
          embeddable: true,
        })),
      },
    ],
  };
}

const seed = {
  hash: "plan-test",
  tracks: {
    tracks: [
      { slug: "foundation", title: "Фундамент", color: "#a78bfa", order: 1, description: "-" },
    ],
    courses: ["calc", "linalg", "phys"].map((slug, order) => ({
      course: slug,
      track: "foundation",
      order,
      prerequisites: [],
    })),
  },
  courses: [course("calc", 20), course("linalg", 20), course("phys", 20)],
} as unknown as Parameters<typeof applySeed>[1];

describe("plan and today API", () => {
  let database: ReturnType<typeof openDatabase>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const today = async (date: string) =>
    (await app.inject({ method: "GET", url: `/api/today?date=${date}` })).json<TodayDto>();

  async function makePlan(courses = ["calc", "linalg", "phys"]) {
    // savePlan lays the plan out from the real today; replanning from MONDAY pins the test dates.
    const response = await app.inject({
      method: "PUT",
      url: "/api/plan",
      payload: {
        startDate: MONDAY,
        studyWeekdays: [1, 2, 3, 4, 5],
        minutesPerDay: 60,
        maxCoursesPerDay: 2,
        includePractice: true,
        courses: courses.map((slug) => ({ slug, weight: 1 })),
      },
    });
    await app.inject({ method: "POST", url: `/api/plan/replan?date=${MONDAY}` });
    return response;
  }

  beforeEach(async () => {
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    applySeed(database.db, seed);
    app = await buildApp({ db: database.db });
  });

  afterEach(async () => {
    await app.close();
    database.close();
  });

  it("asks for a plan before there is one", async () => {
    const view = await today(MONDAY);
    expect(view.plan).toBeNull();
    expect(view.items).toEqual([]);
  });

  it("lays out about an hour a day for two subjects", async () => {
    const response = await makePlan();
    expect(response.statusCode).toBe(200);
    expect(response.json<PlanDto>().courses.map((c) => c.slug)).toEqual(["calc", "linalg", "phys"]);

    const monday = await today(MONDAY);
    expect(monday.plannedSec).toBe(3600);
    expect(new Set(monday.items.map((item) => item.courseSlug))).toEqual(
      new Set(["calc", "linalg"]),
    );
  });

  it("moves a skipped day forward and shifts the rest (SPEC §6.4 acceptance)", async () => {
    await makePlan();
    // The calendar shows the plan as it was laid out, without re-planning.
    const calendar = async (from: string, to: string) =>
      (await app.inject({ method: "GET", url: `/api/calendar?from=${from}&to=${to}` })).json<{
        days: { date: string; items: { youtubeId: string }[] }[];
      }>();
    const before = await calendar(MONDAY, "2026-11-20");
    const videosOn = (days: typeof before.days, date: string) =>
      days.find((day) => day.date === date)?.items.map((item) => item.youtubeId) ?? [];

    // Monday was skipped: opening Tuesday re-plans.
    const tuesday = await today("2026-11-17");
    expect(tuesday.items.map((item) => item.youtubeId)).toEqual(videosOn(before.days, MONDAY));

    const after = await calendar("2026-11-17", "2026-11-20");
    expect(videosOn(after.days, "2026-11-18")).toEqual(videosOn(before.days, "2026-11-17"));
  });

  it("marks a part done when the video is watched past its end", async () => {
    await makePlan(["calc"]);
    const [first] = (await today(MONDAY)).items;
    await app.inject({
      method: "PUT",
      url: `/api/progress/${first!.youtubeId}`,
      payload: { positionSec: first!.endSec, playedSec: 30 },
    });
    const view = await today(MONDAY);
    expect(view.items[0]?.status).toBe("done");
    expect(view.doneSec).toBe(first!.endSec - first!.startSec);
  });

  it("lets the user tick a part by hand and undo it", async () => {
    await makePlan(["calc"]);
    const [first] = (await today(MONDAY)).items;
    const done = await app.inject({
      method: "POST",
      url: `/api/plan/items/${first!.id}`,
      payload: { done: true },
    });
    expect(done.json<{ status: string }>().status).toBe("done");
    const undone = await app.inject({
      method: "POST",
      url: `/api/plan/items/${first!.id}`,
      payload: { done: false },
    });
    expect(undone.json<{ status: string }>().status).toBe("planned");
  });

  it("does not plan a part ticked by hand again", async () => {
    await makePlan(["calc"]);
    const [first] = (await today(MONDAY)).items;
    await app.inject({
      method: "POST",
      url: `/api/plan/items/${first!.id}`,
      payload: { done: true },
    });
    // The next day re-plans from what is covered: the ticked lecture is not offered again.
    const tuesday = await today("2026-11-17");
    expect(tuesday.items.map((item) => item.youtubeId)).not.toContain(first!.youtubeId);
    expect(tuesday.plannedSec).toBe(3600);
  });

  it("refuses a plan without courses", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/plan",
      payload: {
        startDate: MONDAY,
        studyWeekdays: [1],
        minutesPerDay: 60,
        maxCoursesPerDay: 2,
        includePractice: true,
        courses: [],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns a calendar of planned days", async () => {
    await makePlan();
    const calendar = await app.inject({
      method: "GET",
      url: "/api/calendar?from=2026-11-16&to=2026-11-22",
    });
    const days = calendar.json<{ days: { date: string; items: unknown[] }[] }>().days;
    expect(days).toHaveLength(7);
    expect(days.slice(0, 5).every((day) => day.items.length > 0)).toBe(true);
    expect(days.slice(5).every((day) => day.items.length === 0)).toBe(true);
  });

  it("estimates the hours left to Computer Vision", async () => {
    const view = await today(MONDAY);
    expect(view.cv.tracks.map((track) => track.slug)).toEqual(["foundation"]);
    expect(view.cv.hoursLeft).toBe(0);
  });

  it("keeps tasks: add, tick, move to tomorrow, delete", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: { title: "Problem set 1", date: MONDAY },
    });
    expect(created.statusCode).toBe(201);
    const task = created.json<TaskDto>();

    await app.inject({ method: "PATCH", url: `/api/tasks/${task.id}`, payload: { done: true } });
    const list = await app.inject({ method: "GET", url: `/api/tasks?date=${MONDAY}` });
    expect(list.json<TaskDto[]>()[0]).toMatchObject({ title: "Problem set 1", done: true });

    const moved = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${task.id}`,
      payload: { date: "2026-11-17", done: false },
    });
    expect(moved.json<TaskDto>().date).toBe("2026-11-17");

    expect((await app.inject({ method: "DELETE", url: `/api/tasks/${task.id}` })).statusCode).toBe(
      204,
    );
  });

  it("carries unfinished tasks of earlier days over to today", async () => {
    await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: { title: "Old task", date: "2026-11-10" },
    });
    const list = await app.inject({ method: "GET", url: `/api/tasks?date=${MONDAY}` });
    expect(list.json<TaskDto[]>().map((task) => task.title)).toEqual(["Old task"]);
  });
});
