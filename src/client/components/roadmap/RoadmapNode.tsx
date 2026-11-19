import type { RoadmapState } from "@shared/roadmap";
import { cn } from "cn";
import { CircleCheck, Hourglass, Play } from "lucide-react";
import type { ReactNode } from "react";
import { getTrack, type TrackSlug } from "@/app/tracks";
import { ProgressRing } from "@/components/course/ProgressRing";
import { STATE_LABEL } from "@/lib/roadmap";

/** Node states of the roadmap (SPEC §6.3). */
export type RoadmapNodeState = RoadmapState;

interface RoadmapNodeProps {
  title: string;
  university: string;
  track: TrackSlug;
  state: RoadmapNodeState;
  /** Course progress for "in-progress", 0..1. */
  progress?: number;
  /** Course length, shown in the corner. */
  hours?: number;
  /** The title as a link or anything else that replaces the plain text. */
  titleSlot?: ReactNode;
  /** Right side of the state line: "В план", "В плане", "Без видео". */
  action?: ReactNode;
  className?: string;
}

/** Icon of a state: the same on the map, in the list and in the legend. */
export function StateIcon({ state, progress = 0 }: { state: RoadmapNodeState; progress?: number }) {
  if (state === "available")
    return <Play aria-hidden className="size-4 shrink-0 fill-current text-lilac" />;
  if (state === "wait") return <Hourglass aria-hidden className="size-4 shrink-0 text-ink-muted" />;
  if (state === "done") return <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />;
  return <ProgressRing value={progress} size={20} strokeWidth={3} showValue={false} />;
}

/** A course on the roadmap. Color, ring and icon show its state. */
export function RoadmapNode({
  title,
  university,
  track,
  state,
  progress = 0,
  hours,
  titleSlot,
  action,
  className,
}: RoadmapNodeProps) {
  return (
    <div
      className={cn(
        "relative flex w-58 flex-col rounded-2xl border bg-surface p-4 transition-colors duration-150",
        state === "available" &&
          "border-lilac/60 shadow-[0_0_0_1px_rgb(167_139_250/0.25),0_0_28px_-6px_rgb(192_132_252/0.6)]",
        state === "wait" && "border-dashed border-line",
        state === "in-progress" && "border-lilac/30",
        state === "done" && "border-success/40",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", getTrack(track).dotClass)}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{university}</span>
        {hours !== undefined && (
          <span className="shrink-0 font-mono text-xs text-ink-muted">
            {Math.max(1, Math.round(hours))} ч
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-2 line-clamp-2 leading-snug font-semibold",
          state === "wait" ? "text-ink-muted" : "text-ink",
        )}
      >
        {titleSlot ?? title}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-3 text-sm">
        <StateIcon state={state} progress={progress} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            state === "available" && "text-lilac",
            state === "wait" && "text-ink-muted",
            state === "in-progress" && "text-ink",
            state === "done" && "text-success",
          )}
        >
          {STATE_LABEL[state]}
          {state === "in-progress" && ` · ${Math.round(progress * 100)}%`}
        </span>
        {action}
      </div>
    </div>
  );
}
