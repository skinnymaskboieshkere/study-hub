import { ArrowRight, CalendarCheck, CircleCheck, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useToday } from "@/app/queries";
import { Button } from "@/components/ui/button";
import { formatDuration, formatTimecode } from "@/lib/format";
import { watchUrlForItem } from "@/lib/plan";
import { segmentShare, type PlanSegment } from "@/lib/segment";

interface SegmentPanelProps {
  segment: PlanSegment;
  /** The part is over: show "Часть выполнена" and what comes next. */
  done: boolean;
  currentTime: () => number;
  onMarkDone: () => void;
  /** Plays on past the part; absent when the part ends with the video. */
  onContinue?: () => void;
  focus: boolean;
}

/** The plan part being watched: its bounds and progress, then "Часть выполнена" (SPEC §6.4). */
export function SegmentPanel(props: SegmentPanelProps) {
  return props.done ? <SegmentDone {...props} /> : <SegmentProgress {...props} />;
}

function SegmentProgress({ segment, currentTime, onMarkDone }: SegmentPanelProps) {
  const [time, setTime] = useState(currentTime);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(currentTime()), 1000);
    return () => window.clearInterval(timer);
  }, [currentTime]);

  const share = segmentShare(segment, time);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <CalendarCheck aria-hidden className="size-5 shrink-0 text-lilac" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">
          Часть плана:{" "}
          <span className="font-mono">
            {formatTimecode(segment.fromSec)}–{formatTimecode(segment.toSec)}
          </span>
          <span className="text-ink-muted">
            {" "}
            · {formatDuration(segment.toSec - segment.fromSec)}
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Пройдено от части"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-lilac" style={{ width: `${share * 100}%` }} />
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onMarkDone}>
        <CircleCheck aria-hidden />
        Отметить выполненной
      </Button>
    </div>
  );
}

function SegmentDone({ segment, onContinue, focus }: SegmentPanelProps) {
  const today = useToday();
  const next = today.data?.items.find(
    (item) => item.status === "planned" && item.id !== segment.itemId,
  );

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-success/30 bg-success/[0.08] px-4 py-3"
    >
      <CircleCheck aria-hidden className="size-6 shrink-0 text-success" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Часть выполнена</p>
        <p className="text-sm text-ink-muted">
          {next
            ? `Дальше по плану: ${next.courseShortTitle} · ${next.lessonTitle}`
            : "На сегодня это была последняя часть плана."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onContinue && (
          <Button variant="ghost" onClick={onContinue}>
            <Play aria-hidden />
            Смотреть дальше
          </Button>
        )}
        <Button asChild>
          <Link to={next ? `${watchUrlForItem(next)}${focus ? "&focus=1" : ""}` : "/"}>
            {next ? "Следующая часть" : "К плану на сегодня"}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
