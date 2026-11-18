import { CalendarClock, ListChecks } from "lucide-react";
import { CardRow } from "@/components/CardRow";
import { CourseTile } from "@/components/course/CourseCard";
import { CourseHero, HeroBadge } from "@/components/course/CourseHero";
import { PlanItemCard } from "@/components/course/PlanItemCard";
import { TrackPath } from "@/components/TrackPath";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_COURSES, SAMPLE_VIDEO } from "./sample";

/** The home screen built after the mockup, on sample data. Real data arrives in stages 1b–2. */
export function DevHomePage() {
  const activeCourses = SAMPLE_COURSES.filter((course) => course.progress > 0);

  return (
    <>
      <p className="mt-2 mb-4 text-sm text-ink-muted">
        Пример главной на тестовых данных. Настоящие курсы и план появятся на этапах 1b и 2.
      </p>

      <CourseHero
        title="Introduction to Computer Science"
        subject="Программирование"
        university="Harvard CS50x"
        position="Лекция 3 из 11"
        description="Основы программирования: C, Python, SQL и веб. Сейчас — массивы и первые шифры."
        track="foundation"
        shortTitle="CS50x"
        coverVideoId={SAMPLE_VIDEO.cs50xLecture0}
        continueTo="/dev/home"
        programTo="/dev/home"
        badges={
          <>
            <HeroBadge icon={<ListChecks aria-hidden />}>2 из 11 лекций</HeroBadge>
            <HeroBadge icon={<CalendarClock aria-hidden />}>Сегодня 45 мин</HeroBadge>
          </>
        }
      />

      <CardRow title="План на сегодня" badge={<Badge variant="glow">1 из 3</Badge>}>
        <PlanItemCard
          courseShortTitle="CS50P"
          lessonTitle="Lecture 0 — Functions, Variables"
          track="foundation"
          videoId={SAMPLE_VIDEO.cs50pLecture0}
          startSeconds={0}
          endSeconds={2700}
          done
          to="/dev/home"
        />
        <PlanItemCard
          courseShortTitle="CS50x"
          lessonTitle="Lecture 2 — Arrays"
          track="foundation"
          videoId={SAMPLE_VIDEO.cs50xLecture0}
          startSeconds={2700}
          endSeconds={5400}
          to="/dev/home"
        />
        <PlanItemCard
          courseShortTitle="18.06"
          lessonTitle="Lecture 8 — Solving Ax = b: row reduced form R"
          track="foundation"
          startSeconds={0}
          endSeconds={2820}
          to="/dev/home"
        />
      </CardRow>

      <CardRow
        title="Мои курсы"
        badge={<Badge variant="glow">{activeCourses.length} в процессе</Badge>}
      >
        {SAMPLE_COURSES.map((course) => (
          <CourseTile key={course.slug} course={course} to="/dev/home" />
        ))}
      </CardRow>

      <section
        aria-labelledby="path-title"
        className="mt-12 rounded-3xl border border-line bg-surface p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="path-title" className="text-2xl font-semibold text-ink">
            Путь к Computer Vision
          </h2>
          <p className="text-ink-muted">
            Осталось ≈ <span className="font-mono text-ink">186 ч</span> по рекомендованному пути
          </p>
        </div>
        <TrackPath className="mt-6" />
      </section>
    </>
  );
}
