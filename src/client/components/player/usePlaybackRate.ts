import { useState } from "react";
import { clampRate, PLAYBACK_RATES } from "@/lib/player";

const RATE_KEY = "studyhub.playbackRate";

function readStoredRate(): number {
  try {
    const value = Number(localStorage.getItem(RATE_KEY));
    return PLAYBACK_RATES.includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

/** Playback speed, remembered between videos and visits (SPEC §6.2). */
export function usePlaybackRate(player: YT.Player | null) {
  const [rate, setRate] = useState(readStoredRate);

  const applyRate = (next: number) => {
    const clamped = clampRate(next);
    setRate(clamped);
    player?.setPlaybackRate(clamped);
    try {
      localStorage.setItem(RATE_KEY, String(clamped));
    } catch {
      // Private mode: the speed is just not remembered.
    }
  };

  return [rate, applyRate] as const;
}
