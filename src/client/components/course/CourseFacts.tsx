import type { CourseDetailDto } from "@shared/api";
import { CircleCheck, ExternalLink, Hourglass } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { formatPercent } from "@/lib/format";
import { ProgressRing } from "./ProgressRing";

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-muted">{title}</h3>
      <div className="mt-2 text-sm text-ink">{children}</div>
    </div>
  );
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

/** Side facts of a course: what it needs first, where it comes from, its license. */
export function CourseFacts({ course }: { course: CourseDetailDto }) {
  return (
    <aside className="space-y-7 rounded-2xl border border-line bg-surface p-5">
      {course.prerequisites.length > 0 && (
        <Fact title="Лучше пройти сначала">
          <ul className="space-y-3">
            {course.prerequisites.map((item) => (
              <li key={item.slug} className="flex items-center gap-3">
                <ProgressRing value={item.progress} size={32} strokeWidth={3} />
                <div className="min-w-0 flex-1">
                  <Link to={`/courses/${item.slug}`} className="block truncate hover:text-lilac">
                    {item.shortTitle} · {item.title}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    нужно {formatPercent(item.minProgress)}, сейчас {formatPercent(item.progress)}
                  </p>
                </div>
                {item.met ? (
                  <CircleCheck aria-label="Выполнено" className="size-4 shrink-0 text-success" />
                ) : (
                  <Hourglass
                    aria-label="Пока не выполнено"
                    className="size-4 shrink-0 text-ink-muted"
                  />
                )}
              </li>
            ))}
          </ul>
        </Fact>
      )}

      <Fact title="Источник">
        <a
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-lilac underline-offset-4 hover:underline"
        >
          Страница курса · {course.university}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
        <p className="mt-1 text-xs text-ink-muted">Проверено {formatDate(course.verifiedAt)}</p>
      </Fact>

      <Fact title="Лицензия">
        <p>{course.license}</p>
        <p className="mt-1 text-xs text-ink-muted">
          Видео принадлежат университету и показываются через официальный плеер YouTube.
        </p>
      </Fact>

      {course.translation && (
        <Fact title="Русская версия">
          <p>{course.translation.note}</p>
          <a
            href={`https://www.youtube.com/playlist?list=${course.translation.playlistId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-lilac underline-offset-4 hover:underline"
          >
            Канал переводчика: {course.translation.channelTitle}
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </Fact>
      )}

      {course.materials.length > 0 && (
        <Fact title="Материалы">
          <ul className="space-y-1.5">
            {course.materials.map((material) => (
              <li key={material.url}>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-lilac underline-offset-4 hover:underline"
                >
                  {material.title}
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </Fact>
      )}
    </aside>
  );
}
