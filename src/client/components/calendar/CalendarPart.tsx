import type { PlanItemDto } from "@shared/api";
import type { Subject } from "@shared/catalog";
import { cn } from "cn";
import { CircleCheck } from "lucide-react";
import { Link } from "react-router";
import { SUBJECT_COLOR, SUBJECT_LABEL } from "@/app/labels";
import { partLength } from "@/lib/calendar";
import { formatDuration } from "@/lib/format";
import { watchUrlForItem } from "@/lib/plan";

/** One part in the week view: subject color on the left, opens the player on the segment. */
export function CalendarPart({ item }: { item: PlanItemDto }) {
  const done = item.status === "done";
  return (
    <Link
      to={watchUrlForItem(item)}
      style={{ borderLeftColor: SUBJECT_COLOR[item.subject].color }}
      className={cn(
        "block rounded-lg border-l-[3px] bg-surface-2 px-2.5 py-2 transition-colors duration-150 hover:bg-line/60",
        done && "opacity-60",
      )}
    >
      <span className="flex items-center gap-1 text-xs font-medium text-ink">
        {done && <CircleCheck aria-label="Выполнено" className="size-3.5 shrink-0 text-success" />}
        {item.courseShortTitle}
      </span>
      <span className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.lessonTitle}</span>
      <span className="mt-1 block font-mono text-[11px] text-ink-muted">
        {formatDuration(partLength(item))}
      </span>
    </Link>
  );
}

/** Which color means which subject. */
export function SubjectLegend({ subjects }: { subjects: Subject[] }) {
  return (
    <ul
      aria-label="Цвета предметов"
      className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted"
    >
      {subjects.map((subject) => (
        <li key={subject} className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-2.5 rounded-full", SUBJECT_COLOR[subject].dotClass)}
          />
          {SUBJECT_LABEL[subject]}
        </li>
      ))}
    </ul>
  );
}
