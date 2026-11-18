import { SUBJECTS } from "@shared/catalog";
import { todayIso } from "@shared/dates";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useCalendar, usePlan } from "@/app/queries";
import { SubjectLegend } from "@/components/calendar/CalendarPart";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { QueryError } from "@/components/QueryState";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  calendarRange,
  formatMonthTitle,
  formatWeekTitle,
  shiftAnchor,
  totalLength,
  type CalendarView,
} from "@/lib/calendar";
import { formatDuration } from "@/lib/format";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TOGGLE_ITEM =
  "h-9 rounded-full border border-line bg-surface-2 px-4 text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink";

/** /calendar?view=week|month&date=YYYY-MM-DD — the plan by days, colored by subject (SPEC §6.4). */
export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const view: CalendarView = params.get("view") === "month" ? "month" : "week";
  const dateParam = params.get("date") ?? "";
  const anchor = ISO_DATE.test(dateParam) ? dateParam : today;
  const range = calendarRange(view, anchor);
  const calendar = useCalendar(range.from, range.to);
  const plan = usePlan();

  function go(next: { view?: CalendarView; date?: string }) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next.view) updated.set("view", next.view);
        if (next.date) updated.set("date", next.date);
        return updated;
      },
      { replace: true },
    );
  }

  const days = calendar.data?.days ?? [];
  // The month grid shows whole weeks; the totals count only the month itself.
  const items = days
    .filter((day) => view === "week" || day.date.startsWith(anchor.slice(0, 7)))
    .flatMap((day) => day.items);
  const subjects = SUBJECTS.filter((subject) => items.some((item) => item.subject === subject));
  const planned = totalLength(items);
  const done = totalLength(items.filter((item) => item.status === "done"));

  return (
    <div className="pt-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Календарь
          </h1>
          <p className="mt-3 text-ink-muted">
            <span className="text-ink">
              {view === "week" ? formatWeekTitle(range) : formatMonthTitle(anchor)}
            </span>
            {planned > 0 &&
              ` · по плану ${formatDuration(planned)}${done > 0 ? `, сделано ${formatDuration(done)}` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            aria-label="Вид календаря"
            value={view}
            onValueChange={(value) => value && go({ view: value as CalendarView })}
            spacing={2}
          >
            <ToggleGroupItem value="week" className={TOGGLE_ITEM}>
              Неделя
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className={TOGGLE_ITEM}>
              Месяц
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={view === "week" ? "Предыдущая неделя" : "Предыдущий месяц"}
              onClick={() => go({ date: shiftAnchor(view, anchor, -1) })}
            >
              <ChevronLeft />
            </Button>
            <Button variant="secondary" onClick={() => go({ date: today })}>
              Сегодня
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={view === "week" ? "Следующая неделя" : "Следующий месяц"}
              onClick={() => go({ date: shiftAnchor(view, anchor, 1) })}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      {plan.data === null && (
        <div className="mt-6">
          <StateMessage
            icon={CalendarPlus}
            title="Плана пока нет"
            action={
              <Button asChild>
                <Link to="/plan">Составить план</Link>
              </Button>
            }
          >
            Календарь заполнится, когда мастер разложит выбранные курсы по дням.
          </StateMessage>
        </div>
      )}

      {subjects.length > 0 && (
        <div className="mt-6">
          <SubjectLegend subjects={subjects} />
        </div>
      )}

      <div className="mt-5">
        {calendar.isError ? (
          <QueryError error={calendar.error} onRetry={() => void calendar.refetch()} />
        ) : calendar.isPending ? (
          <Skeleton aria-hidden className="h-96 rounded-2xl bg-surface" />
        ) : view === "week" ? (
          <WeekView days={days} today={today} />
        ) : (
          <MonthView
            days={days}
            month={anchor.slice(0, 7)}
            today={today}
            onPickDay={(date) => go({ view: "week", date })}
          />
        )}
      </div>
    </div>
  );
}
