import type { PlanItemDto } from "@shared/api";
import { addDays, fromIsoDate, startOfWeek, toIsoDate } from "@shared/dates";

export type CalendarView = "week" | "month";

export const partLength = (item: Pick<PlanItemDto, "startSec" | "endSec">) =>
  item.endSec - item.startSec;

export const totalLength = (items: Pick<PlanItemDto, "startSec" | "endSec">[]) =>
  items.reduce((sum, item) => sum + partLength(item), 0);

export interface CalendarRange {
  from: string;
  to: string;
}

/** Monday to Sunday of the week with the date. */
export function weekRange(anchor: string): CalendarRange {
  const from = startOfWeek(anchor);
  return { from, to: addDays(from, 6) };
}

/** First day of the date's month, "2026-11-01". */
export function monthStart(anchor: string): string {
  return `${anchor.slice(0, 8)}01`;
}

/** Whole weeks (Monday to Sunday) that cover the date's month: the month grid. */
export function monthRange(anchor: string): CalendarRange {
  const first = fromIsoDate(monthStart(anchor));
  const last = toIsoDate(new Date(first.getFullYear(), first.getMonth() + 1, 0, 12));
  return { from: startOfWeek(toIsoDate(first)), to: addDays(startOfWeek(last), 6) };
}

export function calendarRange(view: CalendarView, anchor: string): CalendarRange {
  return view === "week" ? weekRange(anchor) : monthRange(anchor);
}

/** The previous or next week or month. */
export function shiftAnchor(view: CalendarView, anchor: string, direction: 1 | -1): string {
  if (view === "week") return addDays(anchor, 7 * direction);
  const first = fromIsoDate(monthStart(anchor));
  return toIsoDate(new Date(first.getFullYear(), first.getMonth() + direction, 1, 12));
}

const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long" });

/** "16–22 ноября 2026" or "30 ноября – 6 декабря 2026". */
export function formatWeekTitle({ from, to }: CalendarRange): string {
  const start = fromIsoDate(from);
  const end = fromIsoDate(to);
  const year = end.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${dayMonth.format(end)} ${year}`;
  }
  const startText = dayMonth.format(start);
  return start.getFullYear() === year
    ? `${startText} – ${dayMonth.format(end)} ${year}`
    : `${startText} ${start.getFullYear()} – ${dayMonth.format(end)} ${year}`;
}

/** "Ноябрь 2026". */
export function formatMonthTitle(anchor: string): string {
  const date = fromIsoDate(anchor);
  const name = monthName.format(date);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${date.getFullYear()}`;
}
