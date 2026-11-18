import { Clapperboard } from "lucide-react";
import { Link, useParams } from "react-router";
import { useCourse } from "@/app/queries";
import { CourseFacts } from "@/components/course/CourseFacts";
import { CourseHeader } from "@/components/course/CourseHeader";
import { CourseProgram } from "@/components/course/CourseProgram";
import { QueryError } from "@/components/QueryState";
import { StateMessage } from "@/components/StateMessage";
import { Skeleton } from "@/components/ui/skeleton";

export function CoursePage() {
  const { slug = "" } = useParams();
  const course = useCourse(slug);

  if (course.isPending) {
    return (
      <div aria-hidden className="mt-4 space-y-6">
        <Skeleton className="h-80 rounded-3xl bg-surface" />
        <Skeleton className="h-8 w-64 bg-surface" />
      </div>
    );
  }
  if (course.isError) {
    return (
      <div className="pt-8">
        <QueryError error={course.error} onRetry={() => void course.refetch()} />
        <Link
          to="/courses"
          className="mt-4 inline-block text-lilac underline-offset-4 hover:underline"
        >
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  const data = course.data;
  return (
    <>
      <CourseHeader course={data} />
      <div className="mt-10 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="program-title">
          <h2 id="program-title" className="text-2xl font-semibold text-ink">
            Программа курса
          </h2>
          <div className="mt-4">
            {data.units.length > 0 ? (
              <CourseProgram
                courseSlug={data.slug}
                units={data.units}
                currentYoutubeId={data.nextYoutubeId}
              />
            ) : (
              <StateMessage icon={Clapperboard} title="Видео ещё не импортированы">
                {data.canImport
                  ? "Нажми «Импортировать видео» вверху: список лекций загрузится из официального плейлиста."
                  : "Официальный плейлист для этого курса подберём на этапе 7. Пока можно открыть страницу курса по ссылке справа."}
              </StateMessage>
            )}
          </div>
        </section>
        <CourseFacts course={data} />
      </div>
    </>
  );
}
