import type { ContinueDto } from "@shared/api";
import { BookOpen, ListChecks, Route } from "lucide-react";
import { Link } from "react-router";
import { SUBJECT_LABEL } from "@/app/labels";
import { useCatalog, useContinue } from "@/app/queries";
import { CardRow } from "@/components/CardRow";
import { CourseTile } from "@/components/course/CourseCard";
import { CourseHero, HeroBadge } from "@/components/course/CourseHero";
import { TrackPath } from "@/components/TrackPath";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/format";

export function HomePage() {
  const continueQuery = useContinue();
  const catalog = useCatalog();
  const myCourses = (catalog.data?.courses ?? []).filter(
    (course) => course.collection === "active" || course.collection === "wishlist",
  );
  const activeCount = myCourses.filter((course) => course.collection === "active").length;

  return (
    <>
      {continueQuery.data ? <ContinueHero item={continueQuery.data} /> : <WelcomeHero />}

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

      <section aria-labelledby="today-title" className="mt-12">
        <h2 id="today-title" className="text-2xl font-semibold text-ink">
          План на сегодня
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-8">
          <p className="max-w-[60ch] text-ink-muted">
            План на каждый день появится на этапе 2: мастер разложит лекции и практику по учебным
            дням. Пока выбирай курс в каталоге и смотри — прогресс уже сохраняется.
          </p>
        </div>
      </section>
    </>
  );
}

function ContinueHero({ item }: { item: ContinueDto }) {
  const { course, lesson } = item;
  return (
    <div className="mt-4">
      <CourseHero
        title={course.title}
        subject={SUBJECT_LABEL[course.subject]}
        university={course.university}
        position={item.unitTitle}
        description={`Дальше: ${lesson.title}`}
        track={course.track}
        shortTitle={course.shortTitle}
        coverVideoId={course.coverVideoId ?? undefined}
        continueTo={`/watch/${lesson.youtubeId}?course=${course.slug}`}
        programTo={`/courses/${course.slug}`}
        badges={
          <HeroBadge icon={<ListChecks aria-hidden />}>
            Пройдено {formatPercent(course.progress)}
          </HeroBadge>
        }
      />
    </div>
  );
}

function WelcomeHero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-hero relative mt-4 overflow-hidden rounded-3xl border border-white/5 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
    >
      <h1
        id="hero-title"
        className="max-w-[16ch] font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] font-extrabold tracking-tight text-ink uppercase"
      >
        Путь к Computer Vision
      </h1>
      <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-ink/85">
        Лекции MIT, Harvard, Yale и Stanford, план на каждый день и конспекты в твоём Obsidian — в
        одном месте. Выбери первый курс в каталоге.
      </p>

      <TrackPath className="mt-8 max-w-3xl" />

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="hero" size="pill">
          <Link to="/courses">
            <BookOpen aria-hidden />
            Открыть каталог
          </Link>
        </Button>
        <Button asChild variant="glass" size="pill">
          <Link to="/roadmap">
            <Route aria-hidden />
            Траектории
          </Link>
        </Button>
      </div>
    </section>
  );
}
