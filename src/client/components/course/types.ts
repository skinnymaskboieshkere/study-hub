import type { TrackSlug } from "@/app/tracks";

/** What a course card needs. Filled from the API from stage 1b. */
export interface CourseSummary {
  slug: string;
  title: string;
  /** Short name for tight spots and drawn covers, e.g. "18.06". */
  shortTitle: string;
  university: string;
  instructors: string[];
  track: TrackSlug;
  /** Study year the course fits (1 = first year). */
  level: number;
  /** Video whose thumbnail is the cover; without it a track-colored cover is drawn. */
  coverVideoId?: string;
  /** Share of watched videos, 0..1. */
  progress: number;
  lessonsTotal: number;
  totalSeconds: number;
}
