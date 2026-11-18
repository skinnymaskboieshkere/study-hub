import type { ProgressDto } from "@shared/api";
import { useEffect, useRef } from "react";
import { api, beacon } from "@/lib/api";

const SAVE_EVERY_MS = 5000;
/** The server takes at most this much played time per save (ProgressUpdateSchema). */
const MAX_PLAYED_SEC = 120;

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
 * closed (sendBeacon) — SPEC §6.2 and §9.1. Each save also carries the seconds really played
 * since the previous one: the day's study time for the streak (SPEC §6.4).
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
  /** Played seconds not sent yet, and since when the current playing stretch runs. */
  const playedSec = useRef(0);
  const playingSince = useRef<number | undefined>(undefined);

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

    // Count the playing stretch that just ended (pause, buffering, end of the video).
    if (playing) {
      playingSince.current ??= Date.now();
    } else if (playingSince.current !== undefined) {
      playedSec.current += (Date.now() - playingSince.current) / 1000;
      playingSince.current = undefined;
    }

    function takePlayed(): number {
      if (playingSince.current !== undefined) {
        const now = Date.now();
        playedSec.current += (now - playingSince.current) / 1000;
        playingSince.current = now;
      }
      const whole = Math.floor(playedSec.current);
      playedSec.current -= whole;
      return Math.min(MAX_PLAYED_SEC, whole);
    }

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
      const body = { positionSec: time, playedSec: takePlayed() };
      const result = await api.put<ProgressDto>(url, body).catch(() => undefined);
      if (result?.completed && !completed.current) {
        completed.current = true;
        onCompleted.current();
      }
    }

    function saveOnLeave() {
      const time = currentTime(player);
      if (!shouldSend(time)) return;
      lastSent.current = time;
      beacon(url, { positionSec: time, playedSec: takePlayed() });
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
      if (playingSince.current !== undefined) {
        playedSec.current += (Date.now() - playingSince.current) / 1000;
        playingSince.current = undefined;
      }
      const played = Math.min(MAX_PLAYED_SEC, Math.floor(playedSec.current));
      playedSec.current = 0;
      if (time !== undefined && (time !== lastSent.current || played > 0)) {
        beacon(`/api/progress/${encodeURIComponent(youtubeId)}`, {
          positionSec: time,
          playedSec: played,
        });
      }
    };
  }, [player, youtubeId]);
}
