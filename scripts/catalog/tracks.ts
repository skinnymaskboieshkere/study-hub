import type { SeedTracks } from "@shared/catalog";
import type { CoursePlacement } from "./types";

export const TRACKS: SeedTracks["tracks"] = [
  {
    slug: "foundation",
    title: "Фундамент",
    color: "#a78bfa",
    order: 1,
    description:
      "Предметы 1 курса: программирование, матанализ, линейная алгебра и физика — с механики.",
  },
  {
    slug: "engineering",
    title: "Инженерная база",
    color: "#60a5fa",
    order: 2,
    description:
      "Конец 1-го — 2-й курс: анализ нескольких переменных, дифференциальные уравнения, электричество, цепи, сигналы, вероятность и управление.",
  },
  {
    slug: "robotics",
    title: "Робототехника",
    color: "#34d399",
    order: 3,
    description: "Кинематика, динамика, планирование и управление роботами.",
  },
  {
    slug: "cv",
    title: "Computer Vision",
    color: "#22d3ee",
    order: 4,
    description:
      "Главная цель: классическое зрение, deep learning для зрения и зрение для роботов.",
  },
];

const p = (course: string, minProgress: number) => ({ course, minProgress });
/** A "желательно" prerequisite (SPEC §4): advice only. */
const want = (course: string, minProgress: number) => ({ course, minProgress, optional: true });

/** Recommended path and soft prerequisites (SPEC §4, BRIEF). */
export const PLACEMENTS: CoursePlacement[] = [
  // Track 1: what the user studies now goes to "Хочу пройти".
  { course: "cs50x", track: "foundation", order: 1, initialCollection: "wishlist" },
  { course: "mit-18-01", track: "foundation", order: 2, initialCollection: "wishlist" },
  { course: "mit-18-06", track: "foundation", order: 3, initialCollection: "wishlist" },
  { course: "yale-phys-200", track: "foundation", order: 4, initialCollection: "wishlist" },
  {
    course: "cs50p",
    track: "foundation",
    order: 5,
    prerequisites: [p("cs50x", 0.5)],
    initialCollection: "wishlist",
  },
  { course: "mit-8-01sc", track: "foundation", order: 6 },
  { course: "mit-6-042j", track: "foundation", order: 7 },
  { course: "stanford-cs106b", track: "foundation", order: 8, prerequisites: [p("cs50x", 0.6)] },

  // Track 2
  { course: "mit-18-02", track: "engineering", order: 1, prerequisites: [p("mit-18-01", 0.6)] },
  { course: "mit-18-03", track: "engineering", order: 2, prerequisites: [p("mit-18-01", 0.6)] },
  {
    course: "yale-phys-201",
    track: "engineering",
    order: 3,
    prerequisites: [p("yale-phys-200", 0.6)],
  },
  {
    course: "mit-8-03sc",
    track: "engineering",
    order: 4,
    prerequisites: [p("yale-phys-200", 0.6)],
  },
  {
    course: "mit-6-002",
    track: "engineering",
    order: 5,
    prerequisites: [p("mit-18-01", 0.6), p("yale-phys-201", 0.3)],
  },
  { course: "mit-res-6-007", track: "engineering", order: 6, prerequisites: [p("mit-18-03", 0.4)] },
  {
    course: "harvard-stat-110",
    track: "engineering",
    order: 7,
    prerequisites: [p("mit-18-01", 0.6)],
  },
  {
    course: "uw-control-bootcamp",
    track: "engineering",
    order: 8,
    prerequisites: [p("mit-18-06", 0.6), p("mit-18-03", 0.4)],
  },

  // Track 3
  { course: "stanford-cs223a", track: "robotics", order: 1, prerequisites: [p("mit-18-06", 0.6)] },
  {
    course: "northwestern-modern-robotics",
    track: "robotics",
    order: 2,
    prerequisites: [p("mit-18-06", 0.6), p("yale-phys-200", 0.6)],
  },
  {
    course: "mit-6-4210",
    track: "robotics",
    order: 3,
    prerequisites: [p("stanford-cs223a", 0.5), p("cs50p", 0.6)],
  },
  {
    course: "mit-underactuated",
    track: "robotics",
    order: 4,
    prerequisites: [p("mit-6-4210", 0.5)],
  },

  // Track 4
  {
    course: "columbia-fpcv",
    track: "cv",
    order: 1,
    prerequisites: [p("mit-18-01", 0.6), p("mit-18-06", 0.3)],
  },
  { course: "mit-6-s191", track: "cv", order: 2, prerequisites: [p("cs50p", 0.6)] },
  {
    course: "michigan-eecs-498",
    track: "cv",
    order: 3,
    prerequisites: [
      p("cs50p", 0.8),
      p("mit-18-01", 0.8),
      p("mit-18-06", 0.6),
      want("harvard-stat-110", 0.3),
    ],
  },
  {
    course: "stanford-cs231n",
    track: "cv",
    order: 4,
    prerequisites: [
      p("cs50p", 0.8),
      p("mit-18-01", 0.8),
      p("mit-18-06", 0.6),
      want("harvard-stat-110", 0.3),
    ],
  },
  {
    course: "cv-for-robots",
    track: "cv",
    order: 5,
    prerequisites: [p("stanford-cs231n", 0.6), p("mit-6-4210", 0.3)],
  },
];
