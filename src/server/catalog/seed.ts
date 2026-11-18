import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  SeedCourseSchema,
  SeedTracksSchema,
  type SeedCourse,
  type SeedTracks,
  type SeedUnit,
} from "@shared/catalog";
import { eq, notInArray } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import {
  coursePrerequisites,
  courses,
  courseVideos,
  settings,
  tracks,
  units as unitsTable,
  videos,
} from "../db/schema";

export interface LoadedSeed {
  tracks: SeedTracks;
  courses: SeedCourse[];
  /** Changes whenever any seed file changes. */
  hash: string;
}

type Tx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

/** Reads and validates seed/tracks.json and seed/courses/*.json. */
export function readSeed(seedDir: string): LoadedSeed {
  const hash = createHash("sha256");
  const tracksRaw = readFileSync(path.join(seedDir, "tracks.json"), "utf8");
  hash.update(tracksRaw);
  const seedTracks = SeedTracksSchema.parse(JSON.parse(tracksRaw));

  const courseDir = path.join(seedDir, "courses");
  const files = readdirSync(courseDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const seedCourses = files.map((file) => {
    const raw = readFileSync(path.join(courseDir, file), "utf8");
    hash.update(file).update(raw);
    const course = SeedCourseSchema.parse(JSON.parse(raw));
    if (`${course.slug}.json` !== file)
      throw new Error(`seed: ${file} contains course "${course.slug}"`);
    return course;
  });
  return { tracks: seedTracks, courses: seedCourses, hash: hash.digest("hex") };
}

/** Replaces the program of a course. Progress lives elsewhere and is not touched. */
export function replaceCourseUnits(tx: Tx, courseSlug: string, seedUnits: SeedUnit[]) {
  tx.delete(courseVideos).where(eq(courseVideos.courseSlug, courseSlug)).run();
  tx.delete(unitsTable).where(eq(unitsTable.courseSlug, courseSlug)).run();

  let sortOrder = 0;
  seedUnits.forEach((unit, unitIndex) => {
    const [row] = tx
      .insert(unitsTable)
      .values({ courseSlug, title: unit.title, sortOrder: unitIndex })
      .returning({ id: unitsTable.id })
      .all();
    if (!row) throw new Error(`could not insert unit ${unit.title}`);

    for (const video of unit.videos) {
      const videoValues = {
        durationSec: video.durationSec,
        language: video.language,
        originalYoutubeId: video.originalYoutubeId ?? null,
        embeddable: video.embeddable,
      };
      tx.insert(videos)
        .values({ youtubeId: video.youtubeId, ...videoValues })
        .onConflictDoUpdate({ target: videos.youtubeId, set: videoValues })
        .run();
      tx.insert(courseVideos)
        .values({
          courseSlug,
          youtubeId: video.youtubeId,
          unitId: row.id,
          title: video.title,
          kind: video.kind,
          sortOrder: sortOrder++,
        })
        .onConflictDoNothing()
        .run();
    }
  });
}

/**
 * Writes the catalog into the database. The user's collections and progress stay;
 * courses imported from the app keep their videos while seed/ lists them as candidates.
 */
export function applySeed(db: AppDatabase, seed: LoadedSeed) {
  const placements = new Map(seed.tracks.courses.map((placement) => [placement.course, placement]));

  db.transaction((tx) => {
    for (const track of seed.tracks.tracks) {
      const values = {
        title: track.title,
        color: track.color,
        sortOrder: track.order,
        description: track.description,
      };
      tx.insert(tracks)
        .values({ slug: track.slug, ...values })
        .onConflictDoUpdate({ target: tracks.slug, set: values })
        .run();
    }

    const existing = new Map(
      tx
        .select({
          slug: courses.slug,
          collection: courses.collection,
          importedInApp: courses.importedInApp,
        })
        .from(courses)
        .all()
        .map((row) => [row.slug, row]),
    );

    for (const course of seed.courses) {
      const placement = placements.get(course.slug);
      if (!placement) throw new Error(`seed: course "${course.slug}" is missing in tracks.json`);
      const previous = existing.get(course.slug);
      const keepAppImport = course.status === "candidate" && previous?.importedInApp === true;

      const values = {
        title: course.title,
        shortTitle: course.shortTitle,
        university: course.university,
        instructors: course.instructors,
        subject: course.subject,
        level: course.level,
        description: course.description,
        trackSlug: placement.track,
        sortOrder: placement.order,
        sourceUrl: course.sourceUrl,
        license: course.license,
        status: keepAppImport ? ("imported" as const) : course.status,
        verifiedAt: course.verifiedAt,
        estimatedHours: course.estimatedHours ?? null,
        translation: course.translation ?? null,
        materials: course.materials,
        skills: course.skills,
        playlistIds: course.youtubePlaylistIds,
        importedInApp: keepAppImport,
      };
      tx.insert(courses)
        .values({ slug: course.slug, collection: placement.initialCollection ?? null, ...values })
        .onConflictDoUpdate({ target: courses.slug, set: values })
        .run();

      if (!keepAppImport) replaceCourseUnits(tx, course.slug, course.units);
    }

    const slugs = seed.courses.map((course) => course.slug);
    tx.delete(coursePrerequisites).run();
    for (const placement of seed.tracks.courses) {
      for (const prerequisite of placement.prerequisites) {
        tx.insert(coursePrerequisites)
          .values({
            courseSlug: placement.course,
            requiresSlug: prerequisite.course,
            minProgress: prerequisite.minProgress,
          })
          .run();
      }
    }
    if (slugs.length > 0) tx.delete(courses).where(notInArray(courses.slug, slugs)).run();
  });
}

const SEED_HASH_KEY = "seed_hash";

/** Applies seed/ when its files changed since the last start. */
export function syncSeed(db: AppDatabase, seedDir: string): { applied: boolean; courses: number } {
  const seed = readSeed(seedDir);
  const stored = db.select().from(settings).where(eq(settings.key, SEED_HASH_KEY)).get();
  if (stored && JSON.parse(stored.valueJson) === seed.hash) {
    return { applied: false, courses: seed.courses.length };
  }
  applySeed(db, seed);
  const valueJson = JSON.stringify(seed.hash);
  db.insert(settings)
    .values({ key: SEED_HASH_KEY, valueJson })
    .onConflictDoUpdate({ target: settings.key, set: { valueJson } })
    .run();
  return { applied: true, courses: seed.courses.length };
}
