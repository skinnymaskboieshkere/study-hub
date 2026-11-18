import type { UnitDto } from "@shared/api";
import { PRACTICE_KINDS } from "@shared/catalog";
import { LessonRow } from "./LessonRow";

interface CourseProgramProps {
  courseSlug: string;
  units: UnitDto[];
  /** Highlighted as the lesson that plays now or comes next. */
  currentYoutubeId: string | null;
  /** Narrow list for the player's side panel. */
  compact?: boolean;
}

/** Units and lessons with their status (SPEC §6.1). */
export function CourseProgram({
  courseSlug,
  units,
  currentYoutubeId,
  compact = false,
}: CourseProgramProps) {
  // Lessons are numbered through the whole course, not per unit.
  const firstNumber = units.map((_, index) =>
    units.slice(0, index).reduce((sum, unit) => sum + unit.lessons.length, 1),
  );
  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {units.map((unit, unitIndex) => (
        <section key={unit.id} aria-label={unit.title}>
          <h3
            className={
              compact
                ? "px-3 text-xs font-medium text-ink-muted"
                : "px-3 text-sm font-medium text-ink-muted"
            }
          >
            {unit.title}
          </h3>
          <ol className="mt-1 space-y-0.5">
            {unit.lessons.map((lesson, lessonIndex) => {
              return (
                <LessonRow
                  key={lesson.youtubeId}
                  number={(firstNumber[unitIndex] ?? 1) + lessonIndex}
                  title={lesson.title}
                  durationSeconds={lesson.durationSec}
                  status={lesson.status}
                  progress={lesson.progress}
                  isPractice={PRACTICE_KINDS.includes(lesson.kind)}
                  isRussian={lesson.language === "ru"}
                  youtubeOnly={!lesson.embeddable}
                  isCurrent={lesson.youtubeId === currentYoutubeId}
                  to={`/watch/${lesson.youtubeId}?course=${courseSlug}`}
                />
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
