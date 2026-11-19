import type { TrackSlug } from "./catalog";

export interface RoadmapCourse {
  slug: string;
  track: TrackSlug;
  /** Length of the course: real video time, or the estimate of a candidate. */
  hours: number;
  /** 0..1 */
  progress: number;
  /** The user put the course into "Пройдено" by hand. */
  completed?: boolean;
  prerequisites: RoadmapPrerequisite[];
}

export interface RoadmapPrerequisite {
  course: string;
  minProgress: number;
  /** "Желательно": advice only, never makes a course wait. */
  optional?: boolean;
}

/** Node states of the roadmap (SPEC §6.3). */
export type RoadmapState = "available" | "wait" | "in-progress" | "done";

/** A prerequisite still below its share: what the node's hint names. */
export interface MissingPrerequisite {
  course: string;
  minProgress: number;
  progress: number;
  optional: boolean;
}

export interface RoadmapNodeState {
  state: RoadmapState;
  /** Required ones first, then the "желательно" ones. */
  missing: MissingPrerequisite[];
}

/** A course counts as finished from 99%: the last seconds of credits do not matter. */
export const COURSE_DONE_SHARE = 0.99;

/**
 * How far each course has to go before the Computer Vision track opens (SPEC §6.3):
 * the soft prerequisites of the first CV courses, followed back through their own
 * prerequisites, keeping the highest share any of them asks for.
 */
export function requiredShares(courses: RoadmapCourse[]): Map<string, number> {
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  const required = new Map<string, number>();

  function need(slug: string, share: number) {
    if ((required.get(slug) ?? 0) >= share) return;
    required.set(slug, share);
    for (const prerequisite of bySlug.get(slug)?.prerequisites ?? []) {
      need(prerequisite.course, prerequisite.minProgress);
    }
  }

  // Entry points of the CV track: CV courses that need no other CV course first.
  const entries = courses.filter(
    (course) =>
      course.track === "cv" &&
      !course.prerequisites.some((p) => bySlug.get(p.course)?.track === "cv"),
  );
  for (const entry of entries) {
    for (const prerequisite of entry.prerequisites)
      need(prerequisite.course, prerequisite.minProgress);
  }
  return required;
}

/** "До трека Computer Vision осталось ~N часов" (SPEC §6.3). */
export function hoursToComputerVision(courses: RoadmapCourse[]): number {
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  let hours = 0;
  for (const [slug, share] of requiredShares(courses)) {
    const course = bySlug.get(slug);
    if (course) hours += Math.max(0, share - course.progress) * course.hours;
  }
  return hours;
}

/** Done share of each track, weighted by course length. */
export function trackShares(courses: RoadmapCourse[]): Record<TrackSlug, number> {
  const totals: Record<TrackSlug, { done: number; all: number }> = {
    foundation: { done: 0, all: 0 },
    engineering: { done: 0, all: 0 },
    robotics: { done: 0, all: 0 },
    cv: { done: 0, all: 0 },
  };
  for (const course of courses) {
    totals[course.track].all += course.hours;
    totals[course.track].done += course.hours * course.progress;
  }
  const share = (track: TrackSlug) =>
    totals[track].all > 0 ? totals[track].done / totals[track].all : 0;
  return {
    foundation: share("foundation"),
    engineering: share("engineering"),
    robotics: share("robotics"),
    cv: share("cv"),
  };
}

/**
 * State of every course on the roadmap (SPEC §6.3): done → in progress → wait (a required
 * prerequisite is below its share) → available. A started course stays "in progress" even
 * with gaps: prerequisites are soft, the hint still names them.
 */
export function computeRoadmapState(courses: RoadmapCourse[]): {
  nodes: Map<string, RoadmapNodeState>;
  hoursLeft: number;
} {
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  const nodes = new Map<string, RoadmapNodeState>();
  for (const course of courses) {
    const missing = course.prerequisites
      .map((prerequisite) => ({
        course: prerequisite.course,
        minProgress: prerequisite.minProgress,
        progress: bySlug.get(prerequisite.course)?.progress ?? 0,
        optional: prerequisite.optional ?? false,
      }))
      .filter((item) => item.progress < item.minProgress)
      .sort((a, b) => Number(a.optional) - Number(b.optional));
    const state: RoadmapState =
      course.completed || course.progress >= COURSE_DONE_SHARE
        ? "done"
        : course.progress > 0
          ? "in-progress"
          : missing.some((item) => !item.optional)
            ? "wait"
            : "available";
    nodes.set(course.slug, { state, missing });
  }
  return { nodes, hoursLeft: hoursToComputerVision(courses) };
}
