import type { StatsDto } from "@shared/api";
import { cn } from "cn";
import { Link } from "react-router";
import { getTrack } from "@/app/tracks";
import { formatDuration, formatPercent } from "@/lib/format";

/** Started courses: overall progress and the time given to each in the period. */
export function CourseProgressList({ courses }: { courses: StatsDto["courses"] }) {
  if (courses.length === 0)
    return <p className="text-sm text-ink-muted">Курсы появятся здесь после первой лекции.</p>;
  return (
    <ul className="divide-y divide-line">
      {courses.map((course) => (
        <li key={course.slug} className="flex items-center gap-3 py-3 sm:gap-4">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", getTrack(course.track).dotClass)}
          />
          <Link
            to={`/courses/${encodeURIComponent(course.slug)}`}
            className="min-w-0 flex-1 truncate text-ink hover:text-lilac"
          >
            <span className="font-medium">{course.shortTitle}</span>
            <span className="text-ink-muted"> · {course.title}</span>
          </Link>
          <span className="hidden w-24 text-right font-mono text-xs text-ink-muted sm:block">
            {course.seconds > 0 ? `+${formatDuration(course.seconds)}` : ""}
          </span>
          <span aria-hidden className="h-2 w-20 overflow-hidden rounded-full bg-surface-2 sm:w-40">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${Math.max(course.progress > 0 ? 2 : 0, course.progress * 100)}%` }}
            />
          </span>
          <span className="w-12 text-right font-mono text-sm text-ink">
            {formatPercent(course.progress)}
          </span>
        </li>
      ))}
    </ul>
  );
}
