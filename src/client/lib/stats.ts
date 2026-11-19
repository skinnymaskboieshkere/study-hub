import type { StatsPeriod } from "@shared/stats";
import { fromIsoDate } from "@shared/dates";

/**
 * Clean axis ticks for minutes: 0 and steps of 15 / 30 / 60 / 120 … that cover `max`,
 * about four of them. An empty period still gets a 0–60 scale.
 */
export function minuteTicks(maxMinutes: number): number[] {
  const top = Math.max(maxMinutes, 60);
  const step = [15, 30, 60, 120, 180, 240].find((candidate) => top / candidate <= 4) ?? 360;
  const count = Math.ceil(top / step);
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

const WEEKDAY = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];
const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Label under a column: "пн" for a week, the day of the month for a month. */
export function dayLabel(period: StatsPeriod, iso: string): string {
  const date = fromIsoDate(iso);
  return period === "week" ? (WEEKDAY[date.getDay()] ?? "") : String(date.getDate());
}

/** "16–22 ноября", "28 октября – 3 ноября", "ноябрь 2026". */
export function periodTitle(period: StatsPeriod, from: string, to: string): string {
  const start = fromIsoDate(from);
  const end = fromIsoDate(to);
  if (period === "month") return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${MONTHS_GENITIVE[end.getMonth()]}`
    : `${start.getDate()} ${MONTHS_GENITIVE[start.getMonth()]} – ${end.getDate()} ${MONTHS_GENITIVE[end.getMonth()]}`;
}

/** "чт, 19 ноября" for tooltips. */
export function longDay(iso: string): string {
  const date = fromIsoDate(iso);
  return `${WEEKDAY[date.getDay()]}, ${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}
