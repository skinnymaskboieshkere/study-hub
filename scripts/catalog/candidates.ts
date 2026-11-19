import type { CandidateCourse } from "./types";

/**
 * Courses listed without videos yet (SPEC §4): metadata and an official playlist checked to
 * exist; the "Импортировать видео" button in the app uses the first playlist. Every track 2–4
 * course was imported in stage 7b, so the list is empty until the next candidate.
 */
export const CANDIDATE_COURSES: CandidateCourse[] = [];
