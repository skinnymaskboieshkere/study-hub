import type { ContinueDto, CourseCardDto, PlanItemDto } from "@shared/api";
import { BookOpen, Clock, Languages, ListChecks, Route } from "lucide-react";
import { Link } from "react-router";
import { KIND_LABEL, SUBJECT_LABEL } from "@/app/labels";
import { CourseHero, HeroBadge } from "@/components/course/CourseHero";
import { TrackPath } from "@/components/TrackPath";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatPercent, formatTimecode } from "@/lib/format";
import { isWholeVideo, watchUrlForItem } from "@/lib/plan";

interface TodayHeroProps {
  /** Shows a placeholder of the same size, so the page does not jump. */
  loading: boolean;
  /** Today's parts. */
  items: PlanItemDto[];
  courses: CourseCardDto[];
  continueItem: ContinueDto | null;
}

/**
 * The banner on top of the home page (BRIEF: mockup style): the next part of today's plan,
 * otherwise the lesson to continue, otherwise a welcome.
 */
export function TodayHero({ loading, items, courses, continueItem }: TodayHeroProps) {
  if (loading) return <Skeleton aria-hidden className="h-[26rem] rounded-3xl bg-surface" />;
  const next = items.find((item) => item.status === "planned");
  if (next) {
    return (
      <NextPartHero
        item={next}
        courses={courses}
        number={items.indexOf(next) + 1}
        total={items.length}
      />
    );
  }
  if (continueItem) return <ContinueHero item={continueItem} />;
  return <WelcomeHero />;
}

interface NextPartHeroProps {
  item: PlanItemDto;
  courses: CourseCardDto[];
  number: number;
  total: number;
}

function NextPartHero({ item, courses, number, total }: NextPartHeroProps) {
  const course = courses.find((entry) => entry.slug === item.courseSlug);
  const what = item.kind === "lecture" ? "Дальше" : KIND_LABEL[item.kind];
  const part = isWholeVideo(item)
    ? ""
    : `, с ${formatTimecode(item.startSec)} до ${formatTimecode(item.endSec)}`;
  return (
    <CourseHero
      title={course?.title ?? item.courseShortTitle}
      subject={SUBJECT_LABEL[item.subject]}
      university={course?.university ?? item.courseShortTitle}
      position={total > 1 ? `часть ${number} из ${total} на сегодня` : "часть на сегодня"}
      description={`${what}: ${item.lessonTitle}${part}`}
      track={item.track}
      shortTitle={item.courseShortTitle}
      coverVideoId={item.coverVideoId}
      continueTo={watchUrlForItem(item)}
      programTo={`/courses/${item.courseSlug}`}
      badges={
        <>
          {item.language === "ru" && (
            <HeroBadge icon={<Languages aria-hidden />}>На русском</HeroBadge>
          )}
          <HeroBadge icon={<Clock aria-hidden />}>
            {formatDuration(item.endSec - item.startSec)}
          </HeroBadge>
        </>
      }
    />
  );
}

function ContinueHero({ item }: { item: ContinueDto }) {
  const { course, lesson } = item;
  return (
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
  );
}

function WelcomeHero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-hero relative overflow-hidden rounded-3xl border border-white/5 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
    >
      <h2
        id="hero-title"
        className="max-w-[16ch] font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] font-extrabold tracking-tight text-ink uppercase"
      >
        Путь к Computer Vision
      </h2>
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
