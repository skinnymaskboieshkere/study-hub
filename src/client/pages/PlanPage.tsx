import type { CourseCardDto, PlanDto, PlanInput } from "@shared/api";
import { todayIso } from "@shared/dates";
import { CalendarCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCatalog, usePlan, useSavePlan } from "@/app/queries";
import { DaysOffEditor } from "@/components/plan/DaysOffEditor";
import { PlanCourseList, type CourseChoice } from "@/components/plan/PlanCourseList";
import { StudyDaysEditor } from "@/components/plan/StudyDaysEditor";
import { QueryError } from "@/components/QueryState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatShortDate } from "@/lib/plan";

/** BRIEF: CS50P has to be done before the 2nd semester. */
const DEFAULT_DEADLINES: Record<string, string> = { cs50p: "2027-02-01" };

export function PlanPage() {
  const catalog = useCatalog();
  const plan = usePlan();

  if (catalog.isPending || plan.isPending)
    return <Skeleton className="mt-8 h-96 rounded-3xl bg-surface" />;
  if (catalog.isError)
    return <QueryError error={catalog.error} onRetry={() => void catalog.refetch()} />;
  if (plan.isError) return <QueryError error={plan.error} onRetry={() => void plan.refetch()} />;

  const courses = catalog.data.courses.filter((course) => course.status === "imported");
  return <PlanForm courses={courses} existing={plan.data} />;
}

function initialChoices(courses: CourseCardDto[], existing: PlanDto | null): CourseChoice[] {
  return courses.map((course) => {
    const inPlan = existing?.courses.find((item) => item.slug === course.slug);
    return {
      slug: course.slug,
      selected: existing
        ? Boolean(inPlan)
        : course.track === "foundation" &&
          (course.collection === "active" || course.collection === "wishlist"),
      weight: inPlan?.weight ?? 1,
      deadline: inPlan ? (inPlan.deadline ?? "") : (DEFAULT_DEADLINES[course.slug] ?? ""),
    };
  });
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 max-w-[65ch] text-sm text-ink-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlanForm({ courses, existing }: { courses: CourseCardDto[]; existing: PlanDto | null }) {
  const navigate = useNavigate();
  const save = useSavePlan();
  const [choices, setChoices] = useState(() => initialChoices(courses, existing));
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayIso());
  const [weekdays, setWeekdays] = useState(
    (existing?.studyWeekdays ?? [1, 2, 3, 4, 5]).map(String),
  );
  const [minutes, setMinutes] = useState(String(existing?.minutesPerDay ?? 60));
  const [perDay, setPerDay] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(existing?.minutesByWeekday ?? {}).map(([day, value]) => [day, String(value)]),
    ),
  );
  const [subjectsPerDay, setSubjectsPerDay] = useState(String(existing?.maxCoursesPerDay ?? 2));
  const [practice, setPractice] = useState(existing?.includePractice ?? true);
  const [daysOff, setDaysOff] = useState(existing?.daysOff ?? []);

  const minutesNumber = Number(minutes);
  const selected = choices.filter((choice) => choice.selected);
  const problem =
    selected.length === 0
      ? "Выбери хотя бы один курс."
      : weekdays.length === 0
        ? "Выбери хотя бы один учебный день."
        : !(minutesNumber >= 15 && minutesNumber <= 480)
          ? "Минут в день: от 15 до 480."
          : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    const input: PlanInput = {
      startDate,
      studyWeekdays: weekdays.map(Number),
      minutesPerDay: minutesNumber,
      minutesByWeekday: Object.fromEntries(
        Object.entries(perDay)
          .filter(
            ([day, value]) =>
              weekdays.includes(day) && value !== "" && Number(value) !== minutesNumber,
          )
          .map(([day, value]) => [day, Math.max(0, Math.min(480, Number(value)))]),
      ),
      daysOff,
      maxCoursesPerDay: Number(subjectsPerDay),
      includePractice: practice,
      courses: selected.map((choice) => ({
        slug: choice.slug,
        weight: choice.weight,
        deadline: choice.deadline || null,
      })),
    };
    save.mutate(input, {
      onSuccess: (plan) => {
        toast.success(
          plan.endDate ? `План составлен: до ${formatShortDate(plan.endDate)}` : "План составлен",
        );
        void navigate("/");
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 pt-8 sm:pt-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          План обучения
        </h1>
        <p className="mt-3 max-w-[60ch] text-ink-muted">
          Общий бюджет на день делится между 1–2 предметами по очереди. Длинные лекции режутся на
          части не короче 10 минут; пропущенное само переезжает на следующие дни.
        </p>
      </div>

      <Section
        title="Курсы"
        hint="Приоритет — сколько времени получает курс; дата — к какому дню закончить."
      >
        <PlanCourseList courses={courses} choices={choices} onChange={setChoices} />
      </Section>

      <Section title="Когда учиться">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start">Начало</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minutes">Минут в день</Label>
            <Input
              id="minutes"
              type="number"
              inputMode="numeric"
              min={15}
              max={480}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p id="subjects-label" className="text-sm font-medium text-ink">
              Предметов в день
            </p>
            <ToggleGroup
              type="single"
              aria-labelledby="subjects-label"
              value={subjectsPerDay}
              onValueChange={(v) => v && setSubjectsPerDay(v)}
              spacing={2}
            >
              {["1", "2", "3"].map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="size-10 rounded-full border border-line bg-surface-2 text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink"
                >
                  {value}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <div className="mt-6">
          <StudyDaysEditor
            weekdays={weekdays}
            onWeekdaysChange={setWeekdays}
            perDay={perDay}
            onPerDayChange={setPerDay}
            minutes={minutes}
          />
        </div>
      </Section>

      <Section
        title="Дни без учёбы"
        hint="Сессия, поездки, праздники — в эти дни план ничего не ставит."
      >
        <DaysOffEditor days={daysOff} onChange={setDaysOff} />
      </Section>

      <Section title="Что входит в план">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="practice">Практические занятия: семинары и разборы задач</Label>
          <Switch id="practice" checked={practice} onCheckedChange={setPractice} />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="pill" disabled={Boolean(problem) || save.isPending}>
          <CalendarCheck aria-hidden />
          {save.isPending ? "Составляю…" : existing ? "Пересоставить план" : "Составить план"}
        </Button>
        {problem && <p className="text-sm text-warning">{problem}</p>}
      </div>
    </form>
  );
}
