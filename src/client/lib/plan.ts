import type { PlanItemDto } from "@shared/api";
import { fromIsoDate } from "@shared/dates";

export const WEEKDAYS = [
  { value: 1, short: "Пн" },
  { value: 2, short: "Вт" },
  { value: 3, short: "Ср" },
  { value: 4, short: "Чт" },
  { value: 5, short: "Пт" },
  { value: 6, short: "Сб" },
  { value: 7, short: "Вс" },
];

/** Opens the study screen on exactly this part of the video (SPEC §6.4). */
export function watchUrlForItem(
  item: Pick<PlanItemDto, "id" | "youtubeId" | "courseSlug" | "startSec" | "endSec">,
) {
  const params = new URLSearchParams({
    course: item.courseSlug,
    from: String(item.startSec),
    to: String(item.endSec),
    item: String(item.id),
  });
  return `/watch/${item.youtubeId}?${params.toString()}`;
}

/** "2026-11-18" → "Среда, 18 ноября". */
export function formatDayTitle(isoDate: string): string {
  const text = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fromIsoDate(isoDate));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "2026-11-18" → "18 нояб." */
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(
    fromIsoDate(isoDate),
  );
}

/** "Лекция 2 — Arrays" with the part: "0:45:00–1:30:00" when it is not the whole video. */
export function isWholeVideo(item: Pick<PlanItemDto, "startSec" | "endSec" | "videoDurationSec">) {
  return item.startSec === 0 && item.endSec >= item.videoDurationSec;
}
