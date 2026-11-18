import type { ProgressDto } from "@shared/api";
import { useEffect, useRef } from "react";
import { api, beacon } from "@/lib/api";

const SAVE_EVERY_MS = 5000;

function currentTime(player: YT.Player | null): number | undefined {
  try {
    const time = player?.getCurrentTime();
    return typeof time === "number" && Number.isFinite(time) ? time : undefined;
  } catch {
    // The player may already be destroyed while the page closes.
    return undefined;
  }
}

/**
 * Saves the position every ~5 s while playing, on pause, and when the tab is hidden or
 * closed (sendBeacon) — SPEC §6.2 and §9.1.
 */
export function usePlayerProgress(options: {
  player: YT.Player | null;
  youtubeId: string;
  playing: boolean;
  /** Called once when the server says the video became watched (90%). */
  onCompleted: () => void;
  alreadyCompleted: boolean;
}) {
  const { player, youtubeId, playing } = options;
  const lastSent = useRef<number | undefined>(undefined);
  const completed = useRef(options.alreadyCompleted);
  const onCompleted = useRef(options.onCompleted);

  useEffect(() => {
    onCompleted.current = options.onCompleted;
  });

  useEffect(() => {
    completed.current = options.alreadyCompleted;
    lastSent.current = undefined;
  }, [youtubeId, options.alreadyCompleted]);

  useEffect(() => {
    if (!player) return;
    const url = `/api/progress/${encodeURIComponent(youtubeId)}`;

    function shouldSend(time: number | undefined): time is number {
      return (
        time !== undefined &&
        (lastSent.current === undefined || Math.abs(time - lastSent.current) >= 1)
      );
    }

    async function save() {
      const time = currentTime(player);
      if (!shouldSend(time)) return;
      lastSent.current = time;
      const result = await api.put<ProgressDto>(url, { positionSec: time }).catch(() => undefined);
      if (result?.completed && !completed.current) {
        completed.current = true;
        onCompleted.current();
      }
    }

    function saveOnLeave() {
      const time = currentTime(player);
      if (!shouldSend(time)) return;
      lastSent.current = time;
      beacon(url, { positionSec: time });
    }

    const onVisibility = () => document.visibilityState === "hidden" && saveOnLeave();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", saveOnLeave);

    const timer = playing ? window.setInterval(() => void save(), SAVE_EVERY_MS) : undefined;
    // Pausing or reaching the end saves right away.
    if (!playing) void save();

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", saveOnLeave);
    };
  }, [player, youtubeId, playing]);

  // Leaving the page or switching to another video: the last position goes out with a beacon.
  useEffect(() => {
    if (!player) return;
    return () => {
      const time = currentTime(player);
      if (time !== undefined && time !== lastSent.current) {
        beacon(`/api/progress/${encodeURIComponent(youtubeId)}`, { positionSec: time });
      }
    };
  }, [player, youtubeId]);
}
