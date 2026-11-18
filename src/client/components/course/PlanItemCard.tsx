import { cn } from "cn";
import { CircleCheck } from "lucide-react";
import { Link } from "react-router";
import type { TrackSlug } from "@/app/tracks";
import { formatDuration, formatTimecode } from "@/lib/format";
import { CourseCover } from "./CourseCover";

interface PlanItemCardProps {
  courseShortTitle: string;
  lessonTitle: string;
  track: TrackSlug;
  videoId?: string;
  startSeconds: number;
  endSeconds: number;
  done?: boolean;
  to: string;
}

/** One planned piece of a lecture for today (SPEC §6.4): which video and which minutes. */
export function PlanItemCard(props: PlanItemCardProps) {
  const length = props.endSeconds - props.startSeconds;

  return (
    <Link
      to={props.to}
      className={cn(
        "group flex flex-col rounded-2xl border border-line bg-surface p-3 transition-colors duration-150 hover:border-lilac/40",
        props.done && "opacity-70",
      )}
    >
      <CourseCover
        videoId={props.videoId}
        label={props.courseShortTitle}
        track={props.track}
        className="aspect-video rounded-xl"
      >
        {props.done && (
          <span className="absolute inset-0 grid place-items-center bg-night/60">
            <CircleCheck aria-label="Выполнено" className="size-9 text-success" />
          </span>
        )}
      </CourseCover>
      <p className="mt-3 px-1 text-sm font-medium text-lilac">{props.courseShortTitle}</p>
      <h3 className="mt-0.5 line-clamp-2 px-1 leading-snug font-semibold text-ink">
        {props.lessonTitle}
      </h3>
      <p className="mt-2 flex justify-between gap-2 px-1 pb-1 text-xs text-ink-muted">
        <span className="font-mono">
          {formatTimecode(props.startSeconds)}–{formatTimecode(props.endSeconds)}
        </span>
        <span>{formatDuration(length)}</span>
      </p>
    </Link>
  );
}
