import { cn } from "cn";
import { Circle, CircleCheck, NotebookPen } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { formatTimecode } from "@/lib/format";
import { ProgressRing } from "./ProgressRing";

export type LessonStatus = "done" | "partial" | "new";

interface LessonRowProps {
  number: number;
  title: string;
  durationSeconds: number;
  status: LessonStatus;
  /** Watched share for partial lessons, 0..1. */
  progress?: number;
  isPractice?: boolean;
  hasNote?: boolean;
  /** The lesson that plays now or comes next: highlighted with the violet glow (SPEC §7). */
  isCurrent?: boolean;
  /** Russian translation of the lecture. */
  isRussian?: boolean;
  /** The author forbids playing it inside the app. */
  youtubeOnly?: boolean;
  to: string;
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  done: "просмотрено",
  partial: "начато",
  new: "не начато",
};

/** A lesson in the course program (SPEC §6.1). */
export function LessonRow(props: LessonRowProps) {
  return (
    <li>
      <Link
        to={props.to}
        aria-current={props.isCurrent ? "step" : undefined}
        className={cn(
          "flex items-center gap-4 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-surface-2",
          props.isCurrent &&
            "bg-brand/10 shadow-[0_0_28px_-8px_rgb(192_132_252/0.55)] ring-1 ring-lilac/40 hover:bg-brand/15",
        )}
      >
        <StatusIcon status={props.status} progress={props.progress ?? 0} />
        <span className="w-7 font-mono text-sm text-ink-muted tabular-nums">
          {String(props.number).padStart(2, "0")}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cn("truncate", props.status === "done" ? "text-ink-muted" : "text-ink")}>
            {props.title}
          </span>
          {props.isPractice && <Badge variant="outline">Практика</Badge>}
          {props.isRussian && <Badge variant="secondary">RU</Badge>}
          {props.youtubeOnly && <Badge variant="outline">только на YouTube</Badge>}
          <span className="sr-only">, {STATUS_LABEL[props.status]}</span>
        </span>
        {props.hasNote && (
          <NotebookPen aria-label="Есть конспект" className="size-4 shrink-0 text-lilac" />
        )}
        <span className="font-mono text-sm text-ink-muted tabular-nums">
          {formatTimecode(props.durationSeconds)}
        </span>
      </Link>
    </li>
  );
}

function StatusIcon({ status, progress }: { status: LessonStatus; progress: number }) {
  if (status === "done")
    return <CircleCheck aria-hidden className="size-5 shrink-0 text-success" />;
  if (status === "partial")
    return <ProgressRing value={progress} size={20} strokeWidth={3} showValue={false} />;
  return <Circle aria-hidden className="size-5 shrink-0 text-line" />;
}
