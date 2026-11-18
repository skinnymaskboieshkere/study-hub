import { Play } from "lucide-react";
import { formatTimecode } from "@/lib/format";

interface TimecodeProps {
  seconds: number;
  /** Seeks the player; from stage 4 notes use it too. */
  onSeek?: (seconds: number) => void;
}

/** A clickable moment of a video, e.g. ▶ 12:34 (SPEC §6.6). */
export function Timecode({ seconds, onSeek }: TimecodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSeek?.(seconds)}
      aria-label={`Перемотать на ${formatTimecode(seconds)}`}
      className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-1.5 py-0.5 font-mono text-[13px] text-lilac tabular-nums transition-colors duration-150 hover:bg-brand/25"
    >
      <Play aria-hidden className="size-3 fill-current" />
      {formatTimecode(seconds)}
    </button>
  );
}
