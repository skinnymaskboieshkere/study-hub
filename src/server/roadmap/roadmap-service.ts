import type { CatalogDto, RoadmapDto } from "@shared/api";
import { computeRoadmapState, type RoadmapCourse } from "@shared/roadmap";
import { eq } from "drizzle-orm";
import { getCatalog } from "../catalog/catalog-service";
import type { AppDatabase } from "../db/client";
import { coursePrerequisites, planCourses } from "../db/schema";
import { getActivePlan } from "../plan/plan-service";

/** Length of a course in hours: real video time, or the estimate of a candidate. */
const courseHours = (course: CatalogDto["courses"][number]) =>
  course.status === "imported" ? course.totalSeconds / 3600 : (course.estimatedHours ?? 0);

/** Catalog courses in the shape the roadmap logic works with. */
export function roadmapCourses(db: AppDatabase, catalog = getCatalog(db)): RoadmapCourse[] {
  const prerequisites = db.select().from(coursePrerequisites).all();
  return catalog.courses.map((course) => ({
    slug: course.slug,
    track: course.track,
    hours: courseHours(course),
    progress: course.progress,
    completed: course.collection === "completed",
    prerequisites: prerequisites
      .filter((row) => row.courseSlug === course.slug)
      .map((row) => ({
        course: row.requiresSlug,
        minProgress: row.minProgress,
        optional: row.optional,
      })),
  }));
}

function plannedSlugs(db: AppDatabase): Set<string> {
  const plan = getActivePlan(db);
  if (!plan) return new Set();
  return new Set(
    db
      .select({ slug: planCourses.courseSlug })
      .from(planCourses)
      .where(eq(planCourses.planId, plan.id))
      .all()
      .map((row) => row.slug),
  );
}

/** The roadmap page (SPEC §6.3): every course with its state, and hours left to CV. */
export function getRoadmap(db: AppDatabase): RoadmapDto {
  const catalog = getCatalog(db);
  const courses = roadmapCourses(db, catalog);
  const { nodes, hoursLeft } = computeRoadmapState(courses);
  const bySlug = new Map(catalog.courses.map((course) => [course.slug, course]));
  const inPlan = plannedSlugs(db);

  return {
    tracks: catalog.tracks,
    hoursLeft,
    nodes: courses.flatMap((course) => {
      const card = bySlug.get(course.slug);
      const node = nodes.get(course.slug);
      if (!card || !node) return [];
      return [
        {
          slug: card.slug,
          title: card.title,
          shortTitle: card.shortTitle,
          university: card.university,
          track: card.track,
          order: card.order,
          status: card.status,
          progress: card.progress,
          hours: course.hours,
          state: node.state,
          inPlan: inPlan.has(card.slug),
          prerequisites: course.prerequisites.map((item) => ({
            slug: item.course,
            minProgress: item.minProgress,
            optional: item.optional ?? false,
          })),
          missing: node.missing.map((item) => ({
            slug: item.course,
            shortTitle: bySlug.get(item.course)?.shortTitle ?? item.course,
            minProgress: item.minProgress,
            progress: item.progress,
            optional: item.optional,
          })),
        },
      ];
    }),
  };
}
