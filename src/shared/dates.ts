/** Local calendar dates as "YYYY-MM-DD" strings (CLAUDE.md conventions). */

const pad = (n: number) => String(n).padStart(2, "0");

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Noon avoids daylight-saving surprises when adding days. */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12);
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** ISO weekday: Monday = 1 … Sunday = 7 (the week starts on Monday). */
export function isoWeekday(iso: string): number {
  const day = fromIsoDate(iso).getDay();
  return day === 0 ? 7 : day;
}

/** Monday of the week that contains the date. */
export function startOfWeek(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / 86_400_000);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
