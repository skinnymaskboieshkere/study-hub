import { useSearchParams } from "react-router";
import { useCatalog, useContinue, useToday } from "@/app/queries";
import { CardRow } from "@/components/CardRow";
import { CourseTile } from "@/components/course/CourseCard";
import { QueryError } from "@/components/QueryState";
import { CvProgressCard } from "@/components/today/CvProgressCard";
import { TasksPanel } from "@/components/today/TasksPanel";
import { TodayHero } from "@/components/today/TodayHero";
import { TodayPlan } from "@/components/today/TodayPlan";
import { WeekStrip } from "@/components/today/WeekStrip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Home = the "Сегодня" screen (BRIEF, SPEC §6.4). */
export function HomePage() {
  // `?day=YYYY-MM-DD` shows another day as if it were today: a way to check how the plan
  // catches up after a skipped day. Opening the page without it returns to the real today.
  const [params] = useSearchParams();
  const dayParam = params.get("day") ?? "";
  const today = useToday(ISO_DATE.test(dayParam) ? dayParam : undefined);
  const continueQuery = useContinue();
  const catalog = useCatalog();

  const courses = catalog.data?.courses ?? [];
  const myCourses = courses.filter(
    (course) => course.collection === "active" || course.collection === "wishlist",
  );
  const activeCount = myCourses.filter((course) => course.collection === "active").length;

  return (
    <>
      <h1 className="sr-only">Сегодня</h1>
      <div className="mt-4">
        <TodayHero
          loading={today.isPending || continueQuery.isPending || catalog.isPending}
          items={today.data?.items ?? []}
          courses={courses}
          continueItem={continueQuery.data ?? null}
        />
      </div>

      {today.isError ? (
        <div className="mt-12">
          <QueryError error={today.error} onRetry={() => void today.refetch()} />
        </div>
      ) : today.data ? (
        <>
          <TodayPlan today={today.data} />
          <div className="mt-12 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <TasksPanel date={today.data.date} />
            <div className="grid content-start gap-5">
              <WeekStrip week={today.data.week} today={today.data.date} />
              <CvProgressCard cv={today.data.cv} />
            </div>
          </div>
        </>
      ) : (
        <Skeleton aria-hidden className="mt-12 h-72 rounded-2xl bg-surface" />
      )}

      {myCourses.length > 0 && (
        <CardRow
          title="Мои курсы"
          badge={
            activeCount > 0 ? <Badge variant="glow">{activeCount} в процессе</Badge> : undefined
          }
        >
          {myCourses.map((course) => (
            <CourseTile key={course.slug} course={course} to={`/courses/${course.slug}`} />
          ))}
        </CardRow>
      )}
    </>
  );
}
