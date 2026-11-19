import type { RoadmapNodeDto } from "@shared/api";
import { RoadmapCourseCard } from "@/components/roadmap/RoadmapCourseCard";
import { RoadmapLegend } from "@/components/roadmap/RoadmapLegend";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

const base = {
  order: 1,
  status: "imported",
  inPlan: false,
  prerequisites: [],
  missing: [],
} satisfies Partial<RoadmapNodeDto>;

const NODES: RoadmapNodeDto[] = [
  {
    ...base,
    slug: "cs50x",
    title: "CS50x: Introduction to Computer Science",
    shortTitle: "CS50x",
    university: "Harvard",
    track: "foundation",
    progress: 1,
    hours: 33,
    state: "done",
  },
  {
    ...base,
    slug: "mit-18-06",
    title: "18.06SC Linear Algebra",
    shortTitle: "18.06",
    university: "MIT",
    track: "foundation",
    progress: 0.4,
    hours: 35,
    state: "in-progress",
    inPlan: true,
  },
  {
    ...base,
    slug: "columbia-fpcv",
    title: "First Principles of Computer Vision",
    shortTitle: "FPCV",
    university: "Columbia",
    track: "cv",
    status: "candidate",
    progress: 0,
    hours: 20,
    state: "available",
  },
  {
    ...base,
    slug: "michigan-eecs-498",
    title: "EECS 498-007: Deep Learning for Computer Vision",
    shortTitle: "EECS 498",
    university: "Michigan",
    track: "cv",
    status: "candidate",
    progress: 0,
    hours: 26,
    state: "wait",
    missing: [
      { slug: "mit-18-06", shortTitle: "18.06", minProgress: 0.6, progress: 0.4, optional: false },
      {
        slug: "harvard-stat-110",
        shortTitle: "Stat 110",
        minProgress: 0.3,
        progress: 0,
        optional: true,
      },
    ],
  },
  {
    ...base,
    slug: "mit-18-01",
    title: "18.01 Single Variable Calculus",
    shortTitle: "18.01",
    university: "MIT",
    track: "foundation",
    progress: 0,
    hours: 43,
    state: "available",
  },
];

export function RoadmapSection() {
  return (
    <ShowcaseSection
      id="roadmap"
      title="Дорожная карта"
      description="Узлы карты: цвет, иконка и кольцо показывают состояние, наведение — чего не хватает. Клик открывает курс, значок календаря — мастер плана."
    >
      <ShowcaseGroup title="Обозначения">
        <RoadmapLegend />
      </ShowcaseGroup>
      <ShowcaseGroup title="Узлы: пройден, в процессе (в плане), можно начинать (без видео), лучше подождать, можно начинать">
        <div className="flex flex-wrap gap-4">
          {NODES.map((node) => (
            <RoadmapCourseCard key={node.slug} course={node} />
          ))}
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
