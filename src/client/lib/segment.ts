/** A part of the day's plan opened in the player: `/watch/:id?from=&to=&item=` (SPEC §6.4). */
export interface PlanSegment {
  itemId: number;
  fromSec: number;
  toSec: number;
}

/** Reads the part from the watch URL; null when it is missing or broken. */
export function parseSegment(params: URLSearchParams): PlanSegment | null {
  const raw = [params.get("from"), params.get("to"), params.get("item")];
  if (raw.some((value) => value === null || value.trim() === "")) return null;
  const [fromSec, toSec, itemId] = raw.map(Number) as [number, number, number];
  if (!Number.isFinite(fromSec) || !Number.isFinite(toSec) || fromSec < 0 || toSec <= fromSec) {
    return null;
  }
  if (!Number.isInteger(itemId) || itemId <= 0) return null;
  return { itemId, fromSec, toSec };
}

/**
 * Where the part starts playing: the saved place when it is inside the part (the student
 * left in the middle), otherwise the start of the part.
 */
export function segmentStart(segment: PlanSegment, resumeSec: number): number {
  return resumeSec > segment.fromSec && resumeSec < segment.toSec - 30
    ? resumeSec
    : segment.fromSec;
}

/**
 * True when playback itself went over the end of the part. A jump over it (seeking ahead)
 * does not count: it is at most a few seconds between two checks while playing.
 */
export function reachedSegmentEnd(previousSec: number, currentSec: number, toSec: number): boolean {
  return previousSec < toSec && currentSec >= toSec && currentSec - previousSec <= 5;
}

/** Share of the part already behind, 0..1. */
export function segmentShare(segment: PlanSegment, timeSec: number): number {
  const share = (timeSec - segment.fromSec) / (segment.toSec - segment.fromSec);
  return Math.min(1, Math.max(0, share));
}
