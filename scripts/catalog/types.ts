import type { SeedCourse, SeedUnit, TrackSlug, Collection } from "@shared/catalog";
import type { FetchedVideo } from "../../src/server/catalog/playlist-import";

/** Course fields written by hand; the builder adds status, dates, videos and hours. */
export type CourseMeta = Omit<
  SeedCourse,
  "units" | "status" | "verifiedAt" | "youtubePlaylistIds" | "estimatedHours"
>;

export type LoadPlaylist = (playlistId: string) => Promise<FetchedVideo[]>;

/** A course whose videos are imported now (track 1). */
export interface ImportedCourseRecipe {
  meta: CourseMeta;
  playlistIds: string[];
  build: (load: LoadPlaylist) => Promise<SeedUnit[]>;
}

/** A course listed without videos yet (tracks 2–4, SPEC §4). */
export interface CandidateCourse {
  meta: CourseMeta;
  /** Official playlists checked to exist; the "Импортировать" button uses the first one. */
  playlistIds: string[];
  /** Used only when there is no playlist to measure. */
  estimatedHours?: number;
}

export interface CoursePlacement {
  course: string;
  track: TrackSlug;
  order: number;
  prerequisites?: { course: string; minProgress: number; optional?: boolean }[];
  initialCollection?: Collection;
}
