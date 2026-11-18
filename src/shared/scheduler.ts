import { addDays, daysBetween, isoWeekday } from "./dates";

/** A video still to study, in program order. */
export interface ScheduleVideo {
  youtubeId: string;
  durationSec: number;
  /** Already watched up to here: planning continues from this point. */
  fromSec: number;
}

export interface ScheduleCourse {
  slug: string;
  /** Share of time: 2 = high priority, 1 = normal, 0.5 = low. */
  weight: number;
  /** Finish by this date (e.g. CS50P before the 2nd semester). */
  deadline?: string;
  /**
   * Time this course already got in the plan. Re-planning every day starts from it, so
   * the subjects keep taking turns instead of the first two winning every morning.
   */
  studiedSec?: number;
  videos: ScheduleVideo[];
}

export interface ScheduleInput {
  startDate: string;
  /** ISO weekdays to study on: 1 = Monday … 7 = Sunday. */
  studyWeekdays: number[];
  /** Total budget of a study day (BRIEF: ~60 minutes for all subjects). */
  minutesPerDay: number;
  /** Lighter or heavier days, e.g. { 6: 30 } for Saturdays. */
  minutesByWeekday?: Partial<Record<number, number>>;
  /** Days without study (exams, holidays). */
  daysOff?: string[];
  /** BRIEF: one or two subjects a day, taking turns. */
  maxCoursesPerDay: number;
  /** A subject gets at least this much on its day (BRIEF: blocks of 30–60 minutes). */
  minBlockMinutes?: number;
  /** SPEC §6.4: a part of a video is never shorter than 10 minutes. */
  minPartMinutes?: number;
  /** Already studied on the start date (re-planning in the middle of a day). */
  usedOnStartSec?: number;
  /** Safety limit for the planning horizon. */
  maxDays?: number;
  courses: ScheduleCourse[];
}

export interface ScheduledPart {
  date: string;
  courseSlug: string;
  youtubeId: string;
  startSec: number;
  endSec: number;
}

interface Queue {
  course: ScheduleCourse;
  order: number;
  index: number;
  position: number;
  allocated: number;
}

function remainingOf(queue: Queue): number {
  let total = 0;
  queue.course.videos.forEach((video, index) => {
    if (index > queue.index) total += video.durationSec;
    if (index === queue.index) total += video.durationSec - queue.position;
  });
  return total;
}

function startQueue(course: ScheduleCourse, order: number): Queue {
  const queue: Queue = { course, order, index: 0, position: 0, allocated: course.studiedSec ?? 0 };
  queue.position = Math.min(course.videos[0]?.fromSec ?? 0, course.videos[0]?.durationSec ?? 0);
  skipFinished(queue);
  return queue;
}

/** Moves past videos that have nothing left (watched to the end). */
function skipFinished(queue: Queue) {
  while (queue.index < queue.course.videos.length) {
    const video = queue.course.videos[queue.index];
    if (video && queue.position < video.durationSec) return;
    queue.index += 1;
    const next = queue.course.videos[queue.index];
    queue.position = next ? Math.min(Math.max(0, next.fromSec), next.durationSec) : 0;
  }
}

const hasWork = (queue: Queue) => queue.index < queue.course.videos.length;

/**
 * Lays out the unwatched videos of the chosen courses over study days (SPEC §6.4, BRIEF):
 * a shared daily budget, at most `maxCoursesPerDay` subjects a day taking turns by weight,
 * urgent deadlines first, long videos cut into parts of at least `minPartMinutes`.
 */
export function buildSchedule(input: ScheduleInput): ScheduledPart[] {
  const minPart = (input.minPartMinutes ?? 10) * 60;
  const minBlock = (input.minBlockMinutes ?? 30) * 60;
  const studyDays = new Set(input.studyWeekdays);
  const daysOff = new Set(input.daysOff ?? []);
  const queues = input.courses.map(startQueue);
  const parts: ScheduledPart[] = [];
  if (studyDays.size === 0 || input.minutesPerDay <= 0) return parts;

  const budgetOf = (date: string) =>
    (input.minutesByWeekday?.[isoWeekday(date)] ?? input.minutesPerDay) * 60;

  /** Seconds a day this course needs to make its deadline (0 without one). */
  function neededPerDay(queue: Queue, date: string): number {
    if (!queue.course.deadline) return 0;
    const calendarDays = Math.max(1, daysBetween(date, queue.course.deadline) + 1);
    const studyShare = studyDays.size / 7;
    return remainingOf(queue) / Math.max(1, calendarDays * studyShare);
  }

  function fillBlock(queue: Queue, share: number, date: string): number {
    let used = 0;
    while (hasWork(queue)) {
      const video = queue.course.videos[queue.index];
      if (!video) break;
      const left = video.durationSec - queue.position;
      const room = share - used;
      if (room <= 0) break;
      if (left <= room) {
        parts.push(part(queue, video.youtubeId, queue.position, video.durationSec, date));
        used += left;
        queue.position = video.durationSec;
        skipFinished(queue);
        continue;
      }
      // The video has to be cut. Too little room left today for a real part.
      if (room < minPart) break;
      let end = queue.position + room;
      // Never leave a tail shorter than a part: take it today instead.
      if (video.durationSec - end < minPart) end = video.durationSec;
      parts.push(part(queue, video.youtubeId, queue.position, end, date));
      used += end - queue.position;
      queue.position = end;
      skipFinished(queue);
      break;
    }
    queue.allocated += used;
    return used;
  }

  function part(
    queue: Queue,
    youtubeId: string,
    start: number,
    end: number,
    date: string,
  ): ScheduledPart {
    return {
      date,
      courseSlug: queue.course.slug,
      youtubeId,
      startSec: Math.floor(start),
      endSec: Math.ceil(end),
    };
  }

  /** Urgent deadlines first, then whoever got the least time for its weight. */
  function pick(candidates: Queue[], count: number, date: string, budget: number): Queue[] {
    const urgent = candidates
      .filter((queue) => neededPerDay(queue, date) >= budget * 0.5)
      .sort((a, b) => neededPerDay(b, date) - neededPerDay(a, date));
    const rest = candidates
      .filter((queue) => !urgent.includes(queue))
      .sort(
        (a, b) =>
          a.allocated / a.course.weight - b.allocated / b.course.weight || a.order - b.order,
      );
    return [...urgent, ...rest].slice(0, count);
  }

  let date = input.startDate;
  const maxDays = input.maxDays ?? 730;
  for (let day = 0; day < maxDays && queues.some(hasWork); day += 1, date = addDays(date, 1)) {
    if (!studyDays.has(isoWeekday(date)) || daysOff.has(date)) continue;
    let budget = budgetOf(date) - (day === 0 ? (input.usedOnStartSec ?? 0) : 0);
    if (budget < minPart) continue;

    const slots = Math.max(1, Math.min(input.maxCoursesPerDay, Math.floor(budget / minBlock)));
    const chosen = pick(queues.filter(hasWork), slots, date, budget);
    chosen.forEach((queue, index) => {
      const share = Math.floor(budget / (chosen.length - index));
      budget -= fillBlock(queue, share, date);
    });
    // A subject ran out of videos early: give the rest of the day to another one.
    while (budget >= minPart) {
      const [next] = pick(queues.filter(hasWork), 1, date, budget);
      if (!next) break;
      const used = fillBlock(next, budget, date);
      if (used === 0) break;
      budget -= used;
    }
  }
  return parts;
}
