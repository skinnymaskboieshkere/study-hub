import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatPercent, pluralRu } from "@/lib/format";
import { CourseCover } from "./CourseCover";
import { ProgressRing } from "./ProgressRing";
import { TrackBadge } from "./TrackBadge";
import type { CourseSummary } from "./types";

interface CourseCardProps {
  course: CourseSummary;
  to: string;
}

/** Card for horizontal rows: the title sits on the picture, as on the mockup. */
export function CourseTile({ course, to }: CourseCardProps) {
  // A started course always shows at least a sliver of the bar.
  const barWidth = course.progress > 0 ? Math.max(2, course.progress * 100) : 0;

  return (
    <Link to={to} className="group block rounded-2xl">
      <CourseCover
        videoId={course.coverVideoId}
        label={course.shortTitle}
        track={course.track}
        className="aspect-video rounded-2xl ring-1 ring-white/5 transition-shadow duration-150 group-hover:ring-lilac/40"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-night via-night/40 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 px-4 pt-4 pb-5">
          <p className="text-xs text-ink/70">{course.university}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[17px] leading-snug font-semibold text-white">
            {course.title}
          </h3>
        </div>
        {barWidth > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-white/10"
            aria-label={`Пройдено ${formatPercent(course.progress)}`}
          >
            <div className="h-full bg-lilac" style={{ width: `${barWidth}%` }} />
          </div>
        )}
      </CourseCover>
    </Link>
  );
}

/** Card for the catalog grid: university, instructor, level, progress ring, track (SPEC §6.1). */
export function CourseCard({ course, to }: CourseCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-3 transition-colors duration-150 hover:border-lilac/40 hover:bg-surface-2"
    >
      <CourseCover
        videoId={course.coverVideoId}
        label={course.shortTitle}
        track={course.track}
        className="aspect-video rounded-xl"
      >
        <TrackBadge track={course.track} className="absolute top-2 left-2" />
        {course.hasRussian && (
          <span className="absolute top-2 right-2 rounded-full bg-night/75 px-2 py-1 text-xs font-medium text-ink ring-1 ring-white/10 backdrop-blur-sm">
            есть на русском
          </span>
        )}
      </CourseCover>
      <div className="flex items-start gap-3 px-1 pt-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 leading-snug font-semibold text-ink">{course.title}</h3>
          <p className="mt-1 truncate text-sm text-ink-muted">
            {course.university} · {course.instructors.join(", ")}
          </p>
        </div>
        {course.status !== "candidate" && <ProgressRing value={course.progress} />}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-1 text-xs text-ink-muted">
        <span>{course.level} курс</span>
        {course.status === "candidate" ? (
          <>
            <Badge variant="glow">Кандидат</Badge>
            {course.estimatedHours && (
              <span className="font-mono">≈ {course.estimatedHours} ч</span>
            )}
          </>
        ) : (
          <>
            <span>
              {course.lessonsTotal} {pluralRu(course.lessonsTotal, ["видео", "видео", "видео"])}
            </span>
            <span className="font-mono">{formatDuration(course.totalSeconds)}</span>
          </>
        )}
      </p>
    </Link>
  );
}
