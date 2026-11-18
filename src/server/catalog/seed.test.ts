import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/client";
import { courses, courseVideos, videoProgress } from "../db/schema";
import { applySeed, readSeed, syncSeed } from "./seed";

const lecture = (youtubeId: string, title: string) => ({
  youtubeId,
  title,
  durationSec: 600,
  kind: "lecture",
  language: "en",
  embeddable: true,
});

function course(slug: string, status: "imported" | "candidate", videos: object[] = []) {
  return {
    slug,
    title: `Course ${slug}`,
    shortTitle: slug,
    university: "MIT",
    instructors: ["Someone"],
    subject: "math",
    level: 1,
    description: "Описание",
    sourceUrl: "https://ocw.mit.edu/",
    license: "CC BY-NC-SA 4.0",
    verifiedAt: "2026-11-18",
    status,
    units: videos.length > 0 ? [{ title: "Unit 1", videos }] : [],
  };
}

describe("catalog seed", () => {
  let dir: string;
  let database: ReturnType<typeof openDatabase>;

  function writeSeed(
    courseFiles: ReturnType<typeof course>[],
    collections: Record<string, string> = {},
  ) {
    rmSync(path.join(dir, "courses"), { recursive: true, force: true });
    mkdirSync(path.join(dir, "courses"), { recursive: true });
    for (const item of courseFiles) {
      writeFileSync(path.join(dir, "courses", `${item.slug}.json`), JSON.stringify(item));
    }
    writeFileSync(
      path.join(dir, "tracks.json"),
      JSON.stringify({
        tracks: [
          { slug: "foundation", title: "Фундамент", color: "#a78bfa", order: 1, description: "-" },
        ],
        courses: courseFiles.map((item, index) => ({
          course: item.slug,
          track: "foundation",
          order: index,
          ...(collections[item.slug] ? { initialCollection: collections[item.slug] } : {}),
        })),
      }),
    );
  }

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "study-hub-seed-"));
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
  });

  afterEach(() => {
    database.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads courses with their videos and starting collections", () => {
    writeSeed(
      [course("a", "imported", [lecture("aaaaaaaaaa1", "L1"), lecture("aaaaaaaaaa2", "L2")])],
      { a: "wishlist" },
    );
    applySeed(database.db, readSeed(dir));

    const row = database.db.select().from(courses).where(eq(courses.slug, "a")).get();
    expect(row?.collection).toBe("wishlist");
    expect(database.db.select().from(courseVideos).all()).toHaveLength(2);
  });

  it("keeps the user's collection and progress when the catalog is rebuilt", () => {
    writeSeed([course("a", "imported", [lecture("aaaaaaaaaa1", "L1")])], { a: "wishlist" });
    applySeed(database.db, readSeed(dir));
    database.db.update(courses).set({ collection: "active" }).where(eq(courses.slug, "a")).run();
    database.db
      .insert(videoProgress)
      .values({ youtubeId: "aaaaaaaaaa1", positionSec: 30, maxPositionSec: 30, updatedAt: "x" })
      .run();

    writeSeed([course("a", "imported", [lecture("aaaaaaaaaa1", "L1 renamed")])], { a: "wishlist" });
    applySeed(database.db, readSeed(dir));

    expect(database.db.select().from(courses).get()?.collection).toBe("active");
    expect(database.db.select().from(courseVideos).get()?.title).toBe("L1 renamed");
    expect(database.db.select().from(videoProgress).all()).toHaveLength(1);
  });

  it("removes courses that left the catalog", () => {
    writeSeed([course("a", "candidate"), course("b", "candidate")]);
    applySeed(database.db, readSeed(dir));
    writeSeed([course("a", "candidate")]);
    applySeed(database.db, readSeed(dir));

    expect(database.db.select({ slug: courses.slug }).from(courses).all()).toEqual([{ slug: "a" }]);
  });

  it("keeps videos imported from the app while seed lists the course as a candidate", () => {
    writeSeed([course("a", "candidate")]);
    applySeed(database.db, readSeed(dir));
    database.db.update(courses).set({ importedInApp: true, status: "imported" }).run();
    writeSeed([course("a", "imported", [lecture("aaaaaaaaaa1", "L1")])]);
    // Simulate an in-app import by loading videos, then switch the seed back to "candidate".
    applySeed(database.db, readSeed(dir));
    database.db.update(courses).set({ importedInApp: true }).run();
    writeSeed([course("a", "candidate")]);
    applySeed(database.db, readSeed(dir));

    expect(database.db.select().from(courses).get()?.status).toBe("imported");
    expect(database.db.select().from(courseVideos).all()).toHaveLength(1);
  });

  it("applies the seed only when the files changed", () => {
    writeSeed([course("a", "candidate")]);
    expect(syncSeed(database.db, dir).applied).toBe(true);
    expect(syncSeed(database.db, dir).applied).toBe(false);
    writeSeed([course("a", "candidate"), course("b", "candidate")]);
    expect(syncSeed(database.db, dir).applied).toBe(true);
  });

  it("rejects a course file that does not match its name", () => {
    writeSeed([course("a", "candidate")]);
    writeFileSync(
      path.join(dir, "courses", "wrong.json"),
      JSON.stringify(course("a", "candidate")),
    );
    expect(() => readSeed(dir)).toThrow(/wrong\.json/);
  });
});
