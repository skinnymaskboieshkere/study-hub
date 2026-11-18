import type { TrackSlug } from "@/app/tracks";

/** What a course card needs: a subset of CourseCardDto from the API. */
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
  coverVideoId?: string | null;
  /** Share of watched video time, 0..1. */
  progress: number;
  lessonsTotal: number;
  totalSeconds: number;
  /** "candidate": listed without videos yet. */
  status?: "candidate" | "imported";
  estimatedHours?: number | null;
  /** Some lectures are Russian translations. */
  hasRussian?: boolean;
}
