import { CalendarClock, ListChecks } from "lucide-react";
import { CardRow } from "@/components/CardRow";
import { CourseCard, CourseTile } from "@/components/course/CourseCard";
import { CourseHero, HeroBadge } from "@/components/course/CourseHero";
import { LessonRow } from "@/components/course/LessonRow";
import { ProgressRing } from "@/components/course/ProgressRing";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SAMPLE_COURSES, SAMPLE_LESSONS, SAMPLE_VIDEO } from "../sample";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

export function CourseSection() {
  return (
    <ShowcaseSection
      id="courses"
      title="Курсы"
      description="Обложки — превью лекций с YouTube под тёмной вуалью. Если у курса ещё нет видео, рисуется обложка в цвете трека."
    >
      <ShowcaseGroup title="Баннер текущего курса">
        <CourseHero
          title="Introduction to Computer Science"
          subject="Программирование"
          university="Harvard CS50x"
          position="Лекция 3 из 11"
          description="Основы программирования: C, Python, SQL и веб. Сейчас — массивы и первые шифры."
          track="foundation"
          shortTitle="CS50x"
          coverVideoId={SAMPLE_VIDEO.cs50xLecture0}
          continueTo="/dev/ui"
          programTo="/dev/ui"
          badges={
            <>
              <HeroBadge icon={<ListChecks aria-hidden />}>2 из 11 лекций</HeroBadge>
              <HeroBadge icon={<CalendarClock aria-hidden />}>Сегодня 45 мин</HeroBadge>
            </>
          }
        />
      </ShowcaseGroup>

      <ShowcaseGroup title="Карточки каталога">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_COURSES.slice(0, 3).map((course) => (
            <li key={course.slug}>
              <CourseCard course={course} to="/dev/ui" />
            </li>
          ))}
        </ul>
      </ShowcaseGroup>

      <CardRow title="Мои курсы" badge={<Badge variant="glow">3 в процессе</Badge>}>
        {SAMPLE_COURSES.map((course) => (
          <CourseTile key={course.slug} course={course} to="/dev/ui" />
        ))}
      </CardRow>

      <ShowcaseGroup title="Программа курса">
        <ol className="max-w-3xl space-y-1 rounded-2xl border border-line bg-surface p-2">
          {SAMPLE_LESSONS.map((lesson) => (
            <LessonRow
              key={lesson.number}
              number={lesson.number}
              title={lesson.title}
              durationSeconds={lesson.seconds}
              status={lesson.status}
              progress={"progress" in lesson ? lesson.progress : undefined}
              isPractice={"isPractice" in lesson}
              hasNote={"hasNote" in lesson}
              isCurrent={"isCurrent" in lesson}
              to="/dev/ui"
            />
          ))}
        </ol>
      </ShowcaseGroup>

      <ShowcaseGroup title="Прогресс">
        <div className="flex flex-wrap items-center gap-8">
          <ProgressRing value={0} size={48} />
          <ProgressRing value={0.4} size={48} />
          <ProgressRing value={1} size={48} />
          <div className="w-72 space-y-2">
            <p className="flex justify-between text-sm">
              <span className="text-ink">Сегодня</span>
              <span className="font-mono text-ink-muted">35 / 60 мин</span>
            </p>
            <Progress value={58} aria-label="Прогресс дня" />
          </div>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
