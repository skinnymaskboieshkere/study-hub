import type { CourseCardDto } from "@shared/api";
import { describe, expect, it } from "vitest";
import {
  countByCollection,
  EMPTY_FILTER,
  filterCourses,
  filterFromParams,
  hasActiveFilters,
} from "./catalog-filter";

const course = (slug: string, overrides: Partial<CourseCardDto> = {}): CourseCardDto => ({
  slug,
  title: slug,
  shortTitle: slug,
  university: "MIT",
  instructors: [],
  track: "foundation",
  order: 1,
  subject: "math",
  level: 1,
  status: "imported",
  collection: null,
  coverVideoId: null,
  progress: 0,
  lessonsTotal: 0,
  totalSeconds: 0,
  estimatedHours: null,
  hasRussian: false,
  ...overrides,
});

const courses = [
  course("linear-algebra", { collection: "active" }),
  course("cs50x", { subject: "programming", university: "Harvard", collection: "wishlist" }),
  course("cs231n", { track: "cv", subject: "cv", university: "Stanford", level: 3 }),
];

describe("filterCourses", () => {
  it("returns everything without filters", () => {
    expect(filterCourses(courses, EMPTY_FILTER)).toHaveLength(3);
  });

  it("combines collection, track, subject, university and level", () => {
    const slugs = (filter: Partial<typeof EMPTY_FILTER>) =>
      filterCourses(courses, { ...EMPTY_FILTER, ...filter }).map((c) => c.slug);

    expect(slugs({ collection: "active" })).toEqual(["linear-algebra"]);
    expect(slugs({ tracks: ["cv"] })).toEqual(["cs231n"]);
    expect(slugs({ subjects: ["programming"] })).toEqual(["cs50x"]);
    expect(slugs({ subjects: ["programming", "cv"] })).toEqual(["cs50x", "cs231n"]);
    expect(slugs({ university: "MIT", level: "1" })).toEqual(["linear-algebra"]);
    expect(slugs({ tracks: ["foundation", "cv"], level: "3" })).toEqual(["cs231n"]);
  });
});

describe("filterFromParams", () => {
  it("reads repeated track params and defaults the rest", () => {
    const filter = filterFromParams(
      new URLSearchParams("track=cv&track=robotics&subject=math&level=2"),
    );
    expect(filter).toEqual({
      ...EMPTY_FILTER,
      tracks: ["cv", "robotics"],
      subjects: ["math"],
      level: "2",
    });
    expect(hasActiveFilters(filter)).toBe(true);
    expect(hasActiveFilters(EMPTY_FILTER)).toBe(false);
  });
});

describe("countByCollection", () => {
  it("counts each collection and the total", () => {
    expect(countByCollection(courses)).toEqual({
      all: 3,
      wishlist: 1,
      active: 1,
      completed: 0,
      archived: 0,
    });
  });
});
