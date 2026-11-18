import { cn } from "cn";
import { CircleCheck, Hourglass, Play } from "lucide-react";
import { getTrack, type TrackSlug } from "@/app/tracks";
import { ProgressRing } from "@/components/course/ProgressRing";

/** Node states of the roadmap (SPEC §6.3). */
export type RoadmapNodeState = "available" | "wait" | "in-progress" | "done";

interface RoadmapNodeProps {
  title: string;
  university: string;
  track: TrackSlug;
  state: RoadmapNodeState;
  /** Course progress for "in-progress", 0..1. */
  progress?: number;
}

const STATE_LABEL: Record<RoadmapNodeState, string> = {
  available: "Можно начинать",
  wait: "Лучше подождать",
  "in-progress": "В процессе",
  done: "Пройден",
};

/** A course on the roadmap. Color, ring and icon show its state. */
export function RoadmapNode({ title, university, track, state, progress = 0 }: RoadmapNodeProps) {
  return (
    <div
      className={cn(
        "w-56 rounded-2xl border bg-surface p-4",
        state === "available" &&
          "border-lilac/60 shadow-[0_0_0_1px_rgb(167_139_250/0.25),0_0_28px_-6px_rgb(192_132_252/0.6)]",
        state === "wait" && "border-dashed border-line bg-surface/50",
        state === "in-progress" && "border-lilac/30",
        state === "done" && "border-success/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn("size-2 rounded-full", getTrack(track).dotClass)} />
        <span className="truncate text-xs text-ink-muted">{university}</span>
      </div>
      <p
        className={cn(
          "mt-2 leading-snug font-semibold",
          state === "wait" ? "text-ink-muted" : "text-ink",
        )}
      >
        {title}
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm">
        {state === "available" && <Play aria-hidden className="size-4 fill-current text-lilac" />}
        {state === "wait" && <Hourglass aria-hidden className="size-4 text-ink-muted" />}
        {state === "in-progress" && (
          <ProgressRing value={progress} size={20} strokeWidth={3} showValue={false} />
        )}
        {state === "done" && <CircleCheck aria-hidden className="size-4 text-success" />}
        <span
          className={cn(
            state === "available" && "text-lilac",
            state === "wait" && "text-ink-muted",
            state === "in-progress" && "text-ink",
            state === "done" && "text-success",
          )}
        >
          {STATE_LABEL[state]}
          {state === "in-progress" && ` · ${Math.round(progress * 100)}%`}
        </span>
      </p>
    </div>
  );
}
