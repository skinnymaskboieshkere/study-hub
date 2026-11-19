import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "cn";
import { Target } from "lucide-react";
import { getTrack } from "@/app/tracks";
import type { CourseNode, GoalNode, TrackNode } from "@/lib/roadmap";
import { formatHoursLeft } from "@/lib/roadmap";
import { RoadmapCourseCard } from "./RoadmapCourseCard";

/** Handles only anchor the arrows: nothing can be connected by hand. */
const HANDLE = "!size-1.5 !min-w-0 !border-0 !bg-transparent";

/** A course on the map. "side" handles carry arrows inside one column (see layoutRoadmap). */
export function CourseFlowNode({ data }: NodeProps<CourseNode>) {
  return (
    <>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={HANDLE}
      />
      <Handle
        id="side-in"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={HANDLE}
        style={{ top: "30%" }}
      />
      <RoadmapCourseCard course={data.course} />
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={HANDLE}
      />
      <Handle
        id="side-out"
        type="source"
        position={Position.Left}
        isConnectable={false}
        className={HANDLE}
        style={{ top: "70%" }}
      />
    </>
  );
}

/** Column title above a track. */
export function TrackFlowNode({ data }: NodeProps<TrackNode>) {
  return (
    <div className="flex w-58 items-center gap-2 px-1">
      <span aria-hidden className={cn("size-2.5 rounded-full", getTrack(data.slug).dotClass)} />
      <span className="font-display text-sm font-semibold tracking-wide text-ink uppercase">
        {data.title}
      </span>
    </div>
  );
}

/** The goal at the end of the path: Computer Vision (SPEC §6.3). */
export function GoalFlowNode({ data }: NodeProps<GoalNode>) {
  return (
    <>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={HANDLE}
      />
      <div className="flex h-36 w-58 flex-col justify-center rounded-3xl border border-track-cv/60 bg-gradient-to-br from-track-cv/20 via-surface to-brand/25 p-5 shadow-[0_0_44px_-8px_rgb(34_211_238/0.55)]">
        <div className="flex items-center gap-2 text-xs tracking-wide text-track-cv uppercase">
          <Target aria-hidden className="size-4" />
          Цель пути
        </div>
        <p className="mt-2 font-display text-xl leading-tight font-bold text-ink">
          Computer Vision
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {data.hoursLeft > 0 ? (
            <>
              осталось{" "}
              <span className="font-semibold text-ink">{formatHoursLeft(data.hoursLeft)}</span>
            </>
          ) : (
            "путь открыт"
          )}
        </p>
      </div>
    </>
  );
}
