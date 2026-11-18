import { z } from "zod";
import type { Collection, Subject, TrackSlug, VideoKind } from "./catalog";
import { CollectionSchema } from "./catalog";
import type { LessonStatus } from "./progress";

/** Response of GET /api/health. */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export interface TrackDto {
  slug: TrackSlug;
  title: string;
  color: string;
  order: number;
  description: string;
}

export interface CourseCardDto {
  slug: string;
  title: string;
  shortTitle: string;
  university: string;
  instructors: string[];
  track: TrackSlug;
  order: number;
  subject: Subject;
  level: number;
  status: "candidate" | "imported";
  collection: Collection | null;
  /** Official video used for the cover, null for candidates. */
  coverVideoId: string | null;
  /** 0..1, weighted by video length. */
  progress: number;
  lessonsTotal: number;
  totalSeconds: number;
  estimatedHours: number | null;
  /** Some videos are Russian translations. */
  hasRussian: boolean;
}

export interface CatalogDto {
  tracks: TrackDto[];
  courses: CourseCardDto[];
}

export interface LessonDto {
  youtubeId: string;
  title: string;
  kind: VideoKind;
  durationSec: number;
  language: "en" | "ru";
  embeddable: boolean;
  status: LessonStatus;
  /** 0..1 of this video. */
  progress: number;
}

export interface UnitDto {
  id: number;
  title: string;
  lessons: LessonDto[];
}

export interface PrerequisiteDto {
  slug: string;
  shortTitle: string;
  title: string;
  minProgress: number;
  progress: number;
  met: boolean;
}

export interface CourseDetailDto extends CourseCardDto {
  description: string;
  sourceUrl: string;
  license: string;
  verifiedAt: string;
  translation: { channelTitle: string; playlistId: string; note: string } | null;
  materials: { title: string; url: string }[];
  skills: string[];
  prerequisites: PrerequisiteDto[];
  units: UnitDto[];
  /** First unfinished lesson: where "Продолжить" leads. */
  nextYoutubeId: string | null;
  /** A candidate with an official playlist can be imported from the app. */
  canImport: boolean;
}

export interface WatchDto {
  course: {
    slug: string;
    title: string;
    shortTitle: string;
    track: TrackSlug;
    units: UnitDto[];
  };
  video: LessonDto & {
    originalYoutubeId: string | null;
    /** Where playing starts (SPEC §6.2: continue from the saved place). */
    resumeSec: number;
  };
  previousYoutubeId: string | null;
  nextYoutubeId: string | null;
}

export interface ProgressDto {
  youtubeId: string;
  positionSec: number;
  maxPositionSec: number;
  completed: boolean;
}

export interface BookmarkDto {
  id: number;
  youtubeId: string;
  tSec: number;
  label: string;
  createdAt: string;
}

/** What to continue on the home page. */
export interface ContinueDto {
  course: CourseCardDto;
  lesson: LessonDto;
  unitTitle: string;
}

export const ProgressUpdateSchema = z.object({
  positionSec: z.number().min(0).max(86_400),
});

export const CompletionUpdateSchema = z.object({
  completed: z.boolean(),
});

export const CollectionUpdateSchema = z.object({
  collection: CollectionSchema.nullable(),
});

export const BookmarkCreateSchema = z.object({
  tSec: z.number().min(0).max(86_400),
  label: z.string().trim().min(1).max(200),
});
