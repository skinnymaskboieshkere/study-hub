import { useEffect, useRef } from "react";
import { reachedSegmentEnd } from "@/lib/segment";

const CHECK_EVERY_MS = 500;

function readTime(player: YT.Player): number | undefined {
  try {
    const time = player.getCurrentTime();
    return Number.isFinite(time) ? time : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Watches playback of a plan part and reports when it reaches the part's end (SPEC §6.4:
 * "по концу отрезка — «Часть выполнена»"). Stops once `active` is false.
 */
export function usePlanSegment(options: {
  player: YT.Player | null;
  playing: boolean;
  /** End of the part; undefined when the video is not opened as a plan part. */
  toSec: number | undefined;
  active: boolean;
  onReached: () => void;
}) {
  const { player, playing, toSec, active } = options;
  const onReached = useRef(options.onReached);

  useEffect(() => {
    onReached.current = options.onReached;
  });

  useEffect(() => {
    if (!player || !playing || !active || toSec === undefined) return;
    let previous = readTime(player);
    const timer = window.setInterval(() => {
      const now = readTime(player);
      if (now === undefined) return;
      if (previous !== undefined && reachedSegmentEnd(previous, now, toSec)) {
        window.clearInterval(timer);
        onReached.current();
      }
      previous = now;
    }, CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [player, playing, active, toSec]);
}
