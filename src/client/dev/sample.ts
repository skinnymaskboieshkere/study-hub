import type { CourseSummary } from "@/components/course/types";

/** Official lecture videos linked on the course sites (checked 18.11.2026). */
export const SAMPLE_VIDEO = {
  /** cs50.harvard.edu/x/weeks/0/ */
  cs50xLecture0: "UuIEbpQms8o",
  /** cs50.harvard.edu/python/weeks/0/ */
  cs50pLecture0: "JP7ITIXGpHk",
  /** fpcv.cs.columbia.edu — "Overview" */
  fpcvOverview: "iEGvWcHsf0E",
} as const;

const HOUR = 3600;

/** Example courses for the showcase. Counts and progress are made up. */
export const SAMPLE_COURSES: CourseSummary[] = [
  {
    slug: "cs50x-2026",
    title: "CS50x: Introduction to Computer Science",
    shortTitle: "CS50x",
    university: "Harvard",
    instructors: ["David J. Malan"],
    track: "foundation",
    level: 1,
    coverVideoId: SAMPLE_VIDEO.cs50xLecture0,
    progress: 0.18,
    lessonsTotal: 11,
    totalSeconds: 24 * HOUR,
  },
  {
    slug: "mit-18-06",
    title: "18.06 Linear Algebra",
    shortTitle: "18.06",
    university: "MIT",
    instructors: ["Gilbert Strang"],
    track: "foundation",
    level: 1,
    progress: 0.4,
    lessonsTotal: 34,
    totalSeconds: 27 * HOUR,
  },
  {
    slug: "cs50p",
    title: "CS50P: Introduction to Programming with Python",
    shortTitle: "CS50P",
    university: "Harvard",
    instructors: ["David J. Malan"],
    track: "foundation",
    level: 1,
    coverVideoId: SAMPLE_VIDEO.cs50pLecture0,
    progress: 0,
    lessonsTotal: 10,
    totalSeconds: 15 * HOUR,
  },
  {
    slug: "yale-phys-200",
    title: "Fundamentals of Physics I",
    shortTitle: "PHYS 200",
    university: "Yale",
    instructors: ["Ramamurti Shankar"],
    track: "foundation",
    level: 1,
    progress: 0.05,
    lessonsTotal: 24,
    totalSeconds: 29 * HOUR,
  },
  {
    slug: "modern-robotics",
    title: "Modern Robotics",
    shortTitle: "MR",
    university: "Northwestern",
    instructors: ["Kevin Lynch"],
    track: "robotics",
    level: 2,
    progress: 0,
    lessonsTotal: 97,
    totalSeconds: 9 * HOUR,
  },
  {
    slug: "fpcv",
    title: "First Principles of Computer Vision",
    shortTitle: "FPCV",
    university: "Columbia",
    instructors: ["Shree Nayar"],
    track: "cv",
    level: 2,
    coverVideoId: SAMPLE_VIDEO.fpcvOverview,
    progress: 0,
    lessonsTotal: 90,
    totalSeconds: 20 * HOUR,
  },
];

export const SAMPLE_LESSONS = [
  { number: 1, title: "Lecture 0 — Scratch", seconds: 6420, status: "done", hasNote: true },
  { number: 2, title: "Lecture 1 — C", seconds: 8460, status: "done", hasNote: true },
  {
    number: 3,
    title: "Lecture 2 — Arrays",
    seconds: 7860,
    status: "partial",
    progress: 0.35,
    hasNote: true,
    isCurrent: true,
  },
  { number: 4, title: "Section 2 — Arrays", seconds: 4980, status: "new", isPractice: true },
  { number: 5, title: "Lecture 3 — Algorithms", seconds: 8100, status: "new" },
  { number: 6, title: "Lecture 4 — Memory", seconds: 8820, status: "new" },
] as const;

export const SAMPLE_BOOKMARKS = [
  { seconds: 754, label: "Что такое массив" },
  { seconds: 1980, label: "Пример: шифр Цезаря" },
  { seconds: 3305, label: "Аргументы командной строки" },
];
