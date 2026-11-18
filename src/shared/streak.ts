import { addDays } from "./dates";

/**
 * Days studied in a row up to `today` (SPEC §6.4). A streak is still alive today
 * before the first lesson: then it counts from yesterday.
 */
export function studyStreak(activeDates: Set<string>, today: string): number {
  let day = activeDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeDates.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
