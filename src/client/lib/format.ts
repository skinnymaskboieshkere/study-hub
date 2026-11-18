/** Seconds → timecode: 754 → "12:34", 4325 → "1:12:05". Bad or negative input → "0:00". */
export function formatTimecode(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** Seconds → readable length: 2700 → "45 мин", 8100 → "2 ч 15 мин", 7200 → "2 ч". */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.round(safe / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

/**
 * Russian plural form: pluralRu(1, ["лекция", "лекции", "лекций"]) → "лекция",
 * 3 → "лекции", 11 → "лекций", 21 → "лекция".
 */
export function pluralRu(count: number, forms: [one: string, few: string, many: string]): string {
  const n = Math.abs(Math.trunc(count));
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** Share 0..1 → "37%"; a started course never shows "0%" (0.004 → "<1%"). */
export function formatPercent(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return "0%";
  const percent = Math.floor(share * 100);
  if (percent === 0) return "<1%";
  return `${Math.min(100, percent)}%`;
}
