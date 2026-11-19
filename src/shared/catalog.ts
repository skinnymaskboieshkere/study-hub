import { z } from "zod";

/** YouTube video id: 11 characters of [A-Za-z0-9_-]. */
export const YoutubeIdSchema = z.string().regex(/^[\w-]{11}$/, "not a YouTube video id");

export const TRACK_SLUGS = ["foundation", "engineering", "robotics", "cv"] as const;
export const TrackSlugSchema = z.enum(TRACK_SLUGS);
export type TrackSlug = z.infer<typeof TrackSlugSchema>;

/** Kinds of videos (SPEC §4). Practice = everything except lectures and shorts. */
export const VIDEO_KINDS = [
  "lecture",
  "section",
  "short",
  "recitation",
  "problem-solving",
] as const;
export const VideoKindSchema = z.enum(VIDEO_KINDS);
export type VideoKind = z.infer<typeof VideoKindSchema>;
export const PRACTICE_KINDS: readonly VideoKind[] = ["section", "recitation", "problem-solving"];

export const SUBJECTS = [
  "programming",
  "math",
  "physics",
  "engineering",
  "robotics",
  "cv",
] as const;
export const SubjectSchema = z.enum(SUBJECTS);
export type Subject = z.infer<typeof SubjectSchema>;

export const COLLECTIONS = ["wishlist", "active", "completed", "archived"] as const;
export const CollectionSchema = z.enum(COLLECTIONS);
export type Collection = z.infer<typeof CollectionSchema>;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes");

export const SeedVideoSchema = z.object({
  youtubeId: YoutubeIdSchema,
  title: z.string().min(1),
  durationSec: z.number().int().positive(),
  kind: VideoKindSchema,
  /** Audio language of this video. */
  language: z.enum(["en", "ru"]).default("en"),
  /** For translations: the official video this one replaces. */
  originalYoutubeId: YoutubeIdSchema.optional(),
  /** False when the author forbids playing it outside YouTube. */
  embeddable: z.boolean().default(true),
});
export type SeedVideo = z.infer<typeof SeedVideoSchema>;

export const SeedUnitSchema = z.object({
  title: z.string().min(1),
  videos: z.array(SeedVideoSchema).min(1),
});
export type SeedUnit = z.infer<typeof SeedUnitSchema>;

/** One file in seed/courses/ (SPEC §4, extended by BRIEF). */
export const SeedCourseSchema = z.object({
  slug: SlugSchema,
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  university: z.string().min(1),
  instructors: z.array(z.string().min(1)).min(1),
  subject: SubjectSchema,
  /** Study year the course fits. */
  level: z.number().int().min(1).max(4),
  /** Short Russian description for the catalog. */
  description: z.string().min(1),
  sourceUrl: z.url(),
  license: z.string().min(1),
  verifiedAt: IsoDateSchema,
  status: z.enum(["candidate", "imported"]),
  youtubePlaylistIds: z.array(z.string()).default([]),
  /** Russian translation used for some videos (BRIEF: Russian versions first). */
  translation: z
    .object({ channelTitle: z.string(), playlistId: z.string(), note: z.string() })
    .optional(),
  /** Rough total length for courses without imported videos (roadmap estimates). */
  estimatedHours: z.number().positive().optional(),
  units: z.array(SeedUnitSchema).default([]),
  materials: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
  skills: z.array(z.string()).default([]),
});
export type SeedCourse = z.infer<typeof SeedCourseSchema>;

/** seed/tracks.json: tracks, where each course sits and what it needs first. */
export const SeedTracksSchema = z.object({
  tracks: z.array(
    z.object({
      slug: TrackSlugSchema,
      title: z.string(),
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
      order: z.number().int(),
      description: z.string(),
    }),
  ),
  courses: z.array(
    z.object({
      course: SlugSchema,
      track: TrackSlugSchema,
      order: z.number().int(),
      prerequisites: z
        .array(
          z.object({
            course: SlugSchema,
            minProgress: z.number().min(0).max(1),
            /** "Желательно" (SPEC §4): shown as advice, never makes the course wait. */
            optional: z.boolean().optional(),
          }),
        )
        .default([]),
      /** Collection the course starts in; later the user's choice wins. */
      initialCollection: CollectionSchema.optional(),
    }),
  ),
});
export type SeedTracks = z.infer<typeof SeedTracksSchema>;
