import type { TrackSlug } from "./catalog";

export interface RoadmapCourse {
  slug: string;
  track: TrackSlug;
  /** Length of the course: real video time, or the estimate of a candidate. */
  hours: number;
  /** 0..1 */
  progress: number;
  prerequisites: { course: string; minProgress: number }[];
}

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
