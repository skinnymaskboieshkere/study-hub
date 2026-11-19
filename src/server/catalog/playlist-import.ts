import type { SeedUnit, SeedVideo, VideoKind } from "@shared/catalog";
import type { YouTubeClient } from "../youtube/client";

/** A playable video from a playlist, after filtering (SPEC §9.2). */
export interface FetchedVideo {
  youtubeId: string;
  title: string;
  durationSec: number;
  embeddable: boolean;
  /** Audio language reported by YouTube, if any. */
  audioLanguage?: string;
}

const TRAILER = /\btrailer\b|трейлер|\bpromo\b/iu;

export function isTrailer(title: string): boolean {
  return TRAILER.test(title);
}

/**
 * The number of a lecture/section in its title:
 * "CS50x - Lecture 3 - Algorithms" → 3, "Lec 12 | MIT 18.01" → 12, "7. Solving Ax = 0" → 7,
 * "Лекция №2. Массивы" → 2, "Section 4 - Memory" → 4. Undefined when there is none.
 */
export function numberFromTitle(title: string): number | undefined {
  // \b only knows Latin letters, so the word start is checked with Unicode classes instead.
  const named = /(?<![\p{L}\p{N}])(?:lecture|lec|section|лекция)\s*№?\s*(\d+)/iu.exec(title);
  if (named?.[1]) return Number(named[1]);
  const leading = /^\s*(\d+)\.\s/.exec(title);
  return leading?.[1] ? Number(leading[1]) : undefined;
}

const LECTURE_NUMBER = /(?<![\p{L}\p{N}])(?:lecture|lec)\s*\d+|^\s*\d+\.(?=\s)/iu;

/**
 * The topic of a lecture without its number and the course name around it:
 * "Lec 1: Dot product | MIT 18.02 …" → "Dot product", "Stanford CS231N | Spring 2025 | Lecture 2:
 * Image Classification" → "Image Classification", "1. Electrostatics" → "Electrostatics",
 * "Lec 1 | MIT 18.03 …" → "" (no topic in the title).
 */
export function lectureTopic(title: string): string {
  const segments = title.split(/\s+\|\s+/);
  const index = segments.findIndex((segment) => LECTURE_NUMBER.test(segment));
  if (index < 0) return (segments[0] ?? "").trim();
  const segment = segments[index] ?? "";
  const match = LECTURE_NUMBER.exec(segment);
  const rest = segment
    .slice((match?.index ?? 0) + (match?.[0].length ?? 0))
    .replace(/^[\s:.,\-–—]+/, "")
    .trim();
  // "Lecture 3 | MIT 6.832 (…), Spring 2020 | Dynamic Programming": the topic comes last.
  if (!rest && segments.length - index > 2) return (segments[segments.length - 1] ?? "").trim();
  return rest;
}

/** "Лекция 7 — Wave Equation" or just "Лекция 7" when the title names no topic. */
export function lectureTitle(title: string, fallbackNumber: number): string {
  const number = numberFromTitle(title) ?? fallbackNumber;
  const topic = lectureTopic(title);
  return topic ? `Лекция ${number} — ${topic}` : `Лекция ${number}`;
}

/**
 * Spreads `extras` over `main` in order, keeping proportions:
 * 3 lectures + 6 recitations → 2 recitations after each lecture.
 */
export function interleaveProportionally<A, B>(main: A[], extras: B[]): { item: A; extras: B[] }[] {
  return main.map((item, index) => {
    const from = Math.floor((index * extras.length) / main.length);
    const to = Math.floor(((index + 1) * extras.length) / main.length);
    return { item, extras: extras.slice(from, to) };
  });
}

export function toSeedVideo(
  video: FetchedVideo,
  kind: VideoKind,
  title: string,
  extra: Partial<Pick<SeedVideo, "language" | "originalYoutubeId">> = {},
): SeedVideo {
  return {
    youtubeId: video.youtubeId,
    title,
    durationSec: video.durationSec,
    kind,
    language: extra.language ?? "en",
    ...(extra.originalYoutubeId ? { originalYoutubeId: extra.originalYoutubeId } : {}),
    embeddable: video.embeddable,
  };
}

/** Plain import for a single lecture playlist: one unit, lectures in playlist order. */
export function unitsFromLecturePlaylist(videos: FetchedVideo[]): SeedUnit[] {
  if (videos.length === 0) return [];
  return [
    {
      title: "Лекции",
      videos: videos.map((video, index) =>
        toSeedVideo(
          video,
          "lecture",
          `Лекция ${numberFromTitle(video.title) ?? index + 1} — ${video.title}`,
        ),
      ),
    },
  ];
}

/**
 * Loads a playlist with durations and drops what cannot be studied: deleted, private,
 * live/zero-length videos, trailers and duplicates (SPEC §9.2).
 */
export async function fetchPlaylistVideos(
  yt: YouTubeClient,
  playlistId: string,
): Promise<FetchedVideo[]> {
  const entries = (await yt.listPlaylistItems(playlistId))
    .filter((entry) => entry.available)
    .sort((a, b) => a.position - b.position);
  const details = new Map(
    (await yt.getVideos(entries.map((e) => e.videoId))).map((v) => [v.id, v]),
  );

  const seen = new Set<string>();
  const result: FetchedVideo[] = [];
  for (const entry of entries) {
    const video = details.get(entry.videoId);
    // "unlisted" videos (e.g. CS50 sections) play fine; only private ones are dropped.
    const watchable = video?.privacy === "public" || video?.privacy === "unlisted";
    if (!video || !watchable || video.durationSec <= 0) continue;
    if (seen.has(video.id) || isTrailer(video.title)) continue;
    seen.add(video.id);
    result.push({
      youtubeId: video.id,
      title: video.title.trim(),
      durationSec: video.durationSec,
      embeddable: video.embeddable,
      audioLanguage: video.audioLanguage,
    });
  }
  return result;
}
