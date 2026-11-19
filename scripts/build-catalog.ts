/**
 * Builds the course catalog in seed/ from official YouTube playlists (SPEC §4, §9.2).
 *
 *   npm run catalog            all courses and seed/tracks.json
 *   npm run catalog -- cs50x   one course
 *   npm run catalog -- --tracks  only seed/tracks.json (no YouTube requests)
 *
 * Every file is validated with the shared zod schema before it is written.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SeedCourseSchema, SeedTracksSchema, type SeedCourse } from "@shared/catalog";
import { fetchPlaylistVideos, type FetchedVideo } from "../src/server/catalog/playlist-import";
import { config } from "../src/server/config";
import { createYouTubeClient, YouTubeApiError } from "../src/server/youtube/client";
import { CANDIDATE_COURSES } from "./catalog/candidates";
import { IMPORTED_COURSES } from "./catalog/imported-courses";
import { PLACEMENTS, TRACKS } from "./catalog/tracks";

const SEED_DIR = path.resolve(process.cwd(), "seed");

function localDate() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function writeJson(file: string, data: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeTracks() {
  const tracks = SeedTracksSchema.parse({ tracks: TRACKS, courses: PLACEMENTS });
  writeJson(path.join(SEED_DIR, "tracks.json"), tracks);
  console.log(`tracks.json: ${tracks.tracks.length} tracks, ${tracks.courses.length} courses`);
}

async function main() {
  const only = process.argv[2];

  const known = new Set([...IMPORTED_COURSES, ...CANDIDATE_COURSES].map((c) => c.meta.slug));
  for (const placement of PLACEMENTS) {
    if (!known.has(placement.course)) throw new Error(`tracks: unknown course ${placement.course}`);
    for (const pre of placement.prerequisites ?? []) {
      if (!known.has(pre.course))
        throw new Error(`${placement.course}: unknown prerequisite ${pre.course}`);
    }
  }
  if (only === "--tracks") return writeTracks();

  if (!config.youtubeApiKey) throw new Error("YOUTUBE_API_KEY is empty in .env");
  const yt = createYouTubeClient(config.youtubeApiKey);
  const verifiedAt = localDate();

  const cache = new Map<string, Promise<FetchedVideo[]>>();
  const load = (playlistId: string) => {
    let pending = cache.get(playlistId);
    if (!pending) {
      pending = fetchPlaylistVideos(yt, playlistId);
      cache.set(playlistId, pending);
    }
    return pending;
  };

  for (const recipe of IMPORTED_COURSES) {
    if (only && recipe.meta.slug !== only) continue;
    const units = await recipe.build(load);
    const course: SeedCourse = SeedCourseSchema.parse({
      ...recipe.meta,
      status: "imported",
      verifiedAt,
      youtubePlaylistIds: recipe.playlistIds,
      units,
    });
    const videos = course.units.flatMap((unit) => unit.videos);
    const hours = videos.reduce((sum, video) => sum + video.durationSec, 0) / 3600;
    const russian = videos.filter((video) => video.language === "ru").length;
    const blocked = videos.filter((video) => !video.embeddable).length;
    writeJson(path.join(SEED_DIR, "courses", `${course.slug}.json`), course);
    console.log(
      `${course.slug.padEnd(16)} ${String(videos.length).padStart(4)} videos  ${hours.toFixed(1).padStart(5)} h` +
        `${russian ? `  ru: ${russian}` : ""}${blocked ? `  not embeddable: ${blocked}` : ""}`,
    );
  }

  for (const candidate of CANDIDATE_COURSES) {
    if (only && candidate.meta.slug !== only) continue;
    let estimatedHours = candidate.estimatedHours;
    const first = candidate.playlistIds[0];
    if (first) {
      const videos = await load(first);
      estimatedHours = Math.max(
        1,
        Math.round(videos.reduce((s, v) => s + v.durationSec, 0) / 3600),
      );
    }
    const course = SeedCourseSchema.parse({
      ...candidate.meta,
      status: "candidate",
      verifiedAt,
      youtubePlaylistIds: candidate.playlistIds,
      estimatedHours,
      units: [],
    });
    writeJson(path.join(SEED_DIR, "courses", `${course.slug}.json`), course);
    console.log(`${course.slug.padEnd(28)} candidate  ≈ ${estimatedHours} h`);
  }

  if (!only) writeTracks();
}

main().catch((error: unknown) => {
  if (error instanceof YouTubeApiError)
    console.error(`${error.message} [${error.reason ?? error.status}]`);
  else console.error(error);
  process.exit(1);
});
