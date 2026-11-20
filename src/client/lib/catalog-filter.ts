import type { CourseCardDto } from "@shared/api";
import type { Collection } from "@shared/catalog";

export type CollectionFilter = Collection | "all";

export interface CatalogFilter {
  collection: CollectionFilter;
  /** Empty: all tracks. */
  tracks: string[];
  /** Empty: all subjects. */
  subjects: string[];
  university: string;
  level: string;
}

export const EMPTY_FILTER: CatalogFilter = {
  collection: "all",
  tracks: [],
  subjects: [],
  university: "all",
  level: "all",
};

/** Catalog filters from the address bar, so links and the back button keep them. */
export function filterFromParams(params: URLSearchParams): CatalogFilter {
  return {
    collection: (params.get("collection") as CollectionFilter | null) ?? "all",
    tracks: params.getAll("track"),
    subjects: params.getAll("subject"),
    university: params.get("university") ?? "all",
    level: params.get("level") ?? "all",
  };
}

export function filterCourses(courses: CourseCardDto[], filter: CatalogFilter): CourseCardDto[] {
  return courses.filter(
    (course) =>
      (filter.collection === "all" || course.collection === filter.collection) &&
      (filter.tracks.length === 0 || filter.tracks.includes(course.track)) &&
      (filter.subjects.length === 0 || filter.subjects.includes(course.subject)) &&
      (filter.university === "all" || course.university === filter.university) &&
      (filter.level === "all" || String(course.level) === filter.level),
  );
}

/** Number of courses per collection for the collection switch. */
export function countByCollection(courses: CourseCardDto[]): Record<CollectionFilter, number> {
  const counts: Record<CollectionFilter, number> = {
    all: courses.length,
    wishlist: 0,
    active: 0,
    completed: 0,
    archived: 0,
  };
  for (const course of courses) if (course.collection) counts[course.collection] += 1;
  return counts;
}

export function hasActiveFilters(filter: CatalogFilter): boolean {
  return (
    filter.tracks.length > 0 ||
    filter.subjects.length > 0 ||
    filter.university !== "all" ||
    filter.level !== "all"
  );
}
