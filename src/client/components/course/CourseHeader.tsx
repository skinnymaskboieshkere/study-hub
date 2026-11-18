import type { CourseDetailDto } from "@shared/api";
import { Download, Play } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { SUBJECT_LABEL } from "@/app/labels";
import { useImportCourse } from "@/app/queries";
import { Button } from "@/components/ui/button";
import { formatDuration, formatPercent } from "@/lib/format";
import { CollectionMenu } from "./CollectionMenu";
import { CourseCover } from "./CourseCover";
import { ProgressRing } from "./ProgressRing";

/** Top of the course page: cover light, title, what it is, and the main actions. */
export function CourseHeader({ course }: { course: CourseDetailDto }) {
  const importMutation = useImportCourse(course.slug);
  const started = course.progress > 0;

  function importVideos() {
    importMutation.mutate(undefined, {
      onSuccess: (result) => toast.success(`Видео импортированы: ${result.lessonsTotal}`),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <section
      aria-labelledby="course-title"
      className="relative isolate mt-4 overflow-hidden rounded-3xl border border-white/5 bg-night"
    >
      <CourseCover
        videoId={course.coverVideoId}
        label={course.shortTitle}
        track={course.track}
        quality="maxresdefault"
        className="absolute inset-0 -z-10 sm:left-auto sm:w-[60%] [&_img]:brightness-[0.7] [&_img]:saturate-[0.85]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#0a0810_45%,rgb(10_8_16/0.65))] sm:bg-[linear-gradient(90deg,#0a0810_40%,rgb(10_8_16/0.8)_60%,rgb(10_8_16/0.3))]"
      />

      <div className="max-w-[46rem] px-6 pt-40 pb-9 sm:px-10 sm:py-12">
        <p className="text-[15px] text-ink-muted">
          <span className="text-lilac">{SUBJECT_LABEL[course.subject]}</span> • {course.university}{" "}
          • {course.instructors.join(", ")}
        </p>
        <h1
          id="course-title"
          className="mt-3 font-display text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.1] font-extrabold tracking-tight text-ink"
        >
          {course.title}
        </h1>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-ink/90">{course.description}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {course.nextYoutubeId && (
            <Button asChild variant="hero" size="pill">
              <Link to={`/watch/${course.nextYoutubeId}?course=${course.slug}`}>
                <Play aria-hidden className="fill-current" />
                {started ? "Продолжить" : "Начать курс"}
              </Link>
            </Button>
          )}
          {course.canImport && (
            <Button
              variant="hero"
              size="pill"
              onClick={importVideos}
              disabled={importMutation.isPending}
            >
              <Download aria-hidden />
              {importMutation.isPending ? "Импортирую…" : "Импортировать видео"}
            </Button>
          )}
          <CollectionMenu slug={course.slug} collection={course.collection} />
        </div>

        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          {course.status === "candidate" ? (
            <span>
              Кандидат: видео ещё не импортированы
              {course.estimatedHours ? ` · ≈ ${course.estimatedHours} ч` : ""}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-2">
                <ProgressRing value={course.progress} size={28} strokeWidth={3} showValue={false} />
                Пройдено {formatPercent(course.progress)}
              </span>
              <span>{course.lessonsTotal} видео</span>
              <span className="font-mono">{formatDuration(course.totalSeconds)}</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
