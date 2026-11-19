import { z } from "zod";
import type { Collection, Subject, TrackSlug, VideoKind } from "./catalog";
import { CollectionSchema, YoutubeIdSchema } from "./catalog";
import type { LessonStatus } from "./progress";
import type { RoadmapState } from "./roadmap";

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
  /** "Желательно": advice only. */
  optional: boolean;
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
  /** Seconds really played since the last save: study time for the streak and statistics. */
  playedSec: z.number().min(0).max(120).optional(),
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

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** What the plan wizard sends (SPEC §6.4, BRIEF: one daily budget for all subjects). */
export const PlanInputSchema = z.object({
  startDate: IsoDateSchema,
  studyWeekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  minutesPerDay: z.number().int().min(15).max(480),
  /** Lighter or heavier days: { "6": 30 }. */
  minutesByWeekday: z
    .record(z.string().regex(/^[1-7]$/), z.number().int().min(0).max(480))
    .default({}),
  daysOff: z.array(IsoDateSchema).max(366).default([]),
  maxCoursesPerDay: z.number().int().min(1).max(3),
  includePractice: z.boolean(),
  courses: z
    .array(
      z.object({
        slug: z.string().min(1),
        weight: z.number().min(0.25).max(4),
        deadline: IsoDateSchema.nullable().default(null),
      }),
    )
    .min(1)
    .max(12),
});
export type PlanInput = z.infer<typeof PlanInputSchema>;

export interface PlanDto extends Omit<PlanInput, "courses"> {
  id: number;
  courses: {
    slug: string;
    shortTitle: string;
    title: string;
    track: TrackSlug;
    weight: number;
    deadline: string | null;
  }[];
  /** Last day with a planned part: when the plan ends at this pace. */
  endDate: string | null;
  /** Seconds still planned from today on. */
  remainingSec: number;
}

export interface PlanItemDto {
  id: number;
  date: string;
  status: "planned" | "done" | "skipped";
  courseSlug: string;
  courseShortTitle: string;
  track: TrackSlug;
  subject: Subject;
  youtubeId: string;
  /** Official video for the thumbnail (translations may have their own). */
  coverVideoId: string;
  lessonTitle: string;
  kind: VideoKind;
  startSec: number;
  endSec: number;
  videoDurationSec: number;
  embeddable: boolean;
  language: "en" | "ru";
}

export interface RoadmapNodeDto {
  slug: string;
  title: string;
  shortTitle: string;
  university: string;
  track: TrackSlug;
  order: number;
  status: "candidate" | "imported";
  /** 0..1 */
  progress: number;
  /** Length of the course: real video time, or the estimate of a candidate. */
  hours: number;
  state: RoadmapState;
  /** The course is in the active plan. */
  inPlan: boolean;
  /** Arrows of the graph. */
  prerequisites: { slug: string; minProgress: number; optional: boolean }[];
  /** Prerequisites still below their share: the node's hint. */
  missing: {
    slug: string;
    shortTitle: string;
    minProgress: number;
    progress: number;
    optional: boolean;
  }[];
}

export interface RoadmapDto {
  tracks: TrackDto[];
  nodes: RoadmapNodeDto[];
  /** "До трека Computer Vision осталось ~N часов". */
  hoursLeft: number;
}

export interface TrackProgressDto {
  slug: TrackSlug;
  title: string;
  color: string;
  share: number;
}

export interface TodayDto {
  date: string;
  plan: { id: number; minutesPerDay: number; endDate: string | null } | null;
  items: PlanItemDto[];
  plannedSec: number;
  doneSec: number;
  /** Time really played today, planned or not. */
  studiedSec: number;
  streak: number;
  /** Monday to Sunday of this week. */
  week: { date: string; plannedSec: number; doneSec: number; tracks: TrackSlug[] }[];
  cv: { hoursLeft: number; tracks: TrackProgressDto[] };
}

export interface CalendarDto {
  from: string;
  to: string;
  days: { date: string; items: PlanItemDto[] }[];
}

export const ItemUpdateSchema = z.object({ done: z.boolean() });

export interface TaskDto {
  id: number;
  title: string;
  date: string | null;
  done: boolean;
  createdAt: string;
  doneAt: string | null;
}

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  date: IsoDateSchema.nullable(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  done: z.boolean().optional(),
  date: IsoDateSchema.nullable().optional(),
});

// ── Notes (stage 3) ────────────────────────────────────────────────────────────

export interface NotesStatusDto {
  /** VAULT_PATH is set in .env. */
  configured: boolean;
  /** The folder exists and can be read. */
  available: boolean;
  /** Folder name only: the full path stays on the server. */
  vaultName: string | null;
  notes: number;
}

export interface NoteTreeNodeDto {
  name: string;
  path: string;
  type: "folder" | "note";
  children?: NoteTreeNodeDto[];
}

export interface NoteListItemDto {
  path: string;
  title: string;
  mtimeMs: number;
}

export interface NoteFileDto {
  path: string;
  title: string;
  content: string;
  /** Hash of the content the client edits: a save with an old hash is a conflict. */
  hash: string;
  mtimeMs: number;
  frontmatter: Record<string, unknown> | null;
}

const VaultPathSchema = z.string().trim().max(500);

export const NoteSaveSchema = z.object({
  path: VaultPathSchema.min(1),
  content: z.string().max(5_000_000),
  /** null = a new file that must not exist yet. */
  baseHash: z.string().nullable(),
});

export interface NoteSavedDto {
  path: string;
  hash: string;
  mtimeMs: number;
}

export const NoteCreateSchema = z.object({
  folder: VaultPathSchema.default(""),
  name: z.string().trim().max(200).optional(),
});

export const FolderCreateSchema = z.object({
  parent: VaultPathSchema.default(""),
  name: z.string().trim().min(1).max(200),
});

export interface BacklinkDto {
  path: string;
  title: string;
  mentions: { line: number; context: string }[];
}

export interface TagCountDto {
  tag: string;
  count: number;
}

export interface NoteSearchResultDto {
  path: string;
  title: string;
  /** Found words are wrapped in \u0002 … \u0003. */
  snippet: string;
}

// ── Video ↔ notes (stage 4) ────────────────────────────────────────────────────

export interface VideoNoteDto {
  path: string;
  title: string;
  /** The lecture note of this video (frontmatter `video:`), not just a link to it. */
  lecture: boolean;
  /** Lines with a link or a timecode to the video. */
  mentions: { line: number; context: string; tSec: number }[];
}

export const LectureNoteCreateSchema = z.object({
  youtubeId: YoutubeIdSchema,
  course: z.string().max(100).optional(),
});

export interface LectureNoteDto {
  /** null: the lecture has no note yet. */
  path: string | null;
  created: boolean;
}

export const DailyNoteSchema = z.object({ date: IsoDateSchema });

export interface NoteTemplateDto {
  path: string;
  name: string;
}

// ── Notes: rename, trash, graph (stage 5) ──────────────────────────────────────

export const RenameSchema = z.object({
  from: z.string().trim().min(1).max(500),
  to: z.string().trim().min(1).max(500),
});

export interface RenameResultDto {
  path: string;
  /** Links rewritten across the vault, and in how many notes. */
  links: number;
  files: number;
}

export interface TrashItemDto {
  name: string;
  size: number;
  mtimeMs: number;
}

export const RestoreSchema = z.object({
  name: z.string().min(1).max(300),
  folder: z.string().max(500).default(""),
});
