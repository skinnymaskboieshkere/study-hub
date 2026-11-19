import type { StatsDto } from "@shared/api";
import { todayIso } from "@shared/dates";
import type { StatsPeriod } from "@shared/stats";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { SUBJECT_COLOR, SUBJECT_LABEL } from "@/app/labels";
import { useStats } from "@/app/queries";
import { getTrack } from "@/app/tracks";
import { QueryError } from "@/components/QueryState";
import { BreakdownBars } from "@/components/stats/BreakdownBars";
import { CourseProgressList } from "@/components/stats/CourseProgressList";
import { DailyChart } from "@/components/stats/DailyChart";
import { StatTiles } from "@/components/stats/StatTiles";
import { CvProgressCard } from "@/components/today/CvProgressCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { periodTitle } from "@/lib/stats";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatsBody({ stats }: { stats: StatsDto }) {
  return (
    <div className="space-y-6">
      <StatTiles stats={stats} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="По дням">
          <DailyChart stats={stats} />
        </Card>
        <CvProgressCard cv={stats.cv} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="По трекам">
          <BreakdownBars
            empty="За этот период учёбы не было."
            items={stats.byTrack.map((track) => ({
              key: track.slug,
              label: track.title,
              dotClass: getTrack(track.slug).dotClass,
              seconds: track.seconds,
            }))}
          />
        </Card>
        <Card title="По предметам">
          <BreakdownBars
            empty="За этот период учёбы не было."
            items={stats.bySubject.map((item) => ({
              key: item.subject,
              label: SUBJECT_LABEL[item.subject],
              dotClass: SUBJECT_COLOR[item.subject].dotClass,
              seconds: item.seconds,
            }))}
          />
        </Card>
      </div>
      <Card title="Курсы">
        <CourseProgressList courses={stats.courses} />
      </Card>
    </div>
  );
}

/** "Статистика" (SPEC §6.7): a week or a month of study, with the way to CV. */
export function StatsPage() {
  const [params, setParams] = useSearchParams();
  const period: StatsPeriod = params.get("period") === "month" ? "month" : "week";
  const date = params.get("date") ?? todayIso();
  const stats = useStats(period, date);

  const go = (next: { period?: StatsPeriod; date?: string | null }) => {
    const query = new URLSearchParams();
    const nextPeriod = next.period ?? period;
    if (nextPeriod === "month") query.set("period", "month");
    const nextDate = next.date === undefined ? params.get("date") : next.date;
    if (nextDate) query.set("date", nextDate);
    setParams(query, { replace: true });
  };

  return (
    <section className="space-y-6 pt-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Статистика
          </h1>
          <div className="mt-3 flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={period === "week" ? "Предыдущая неделя" : "Предыдущий месяц"}
              disabled={!stats.data}
              onClick={() => stats.data && go({ date: stats.data.previous })}
            >
              <ChevronLeft />
            </Button>
            <p className="min-w-44 text-center text-lg text-ink" aria-live="polite">
              {stats.data ? periodTitle(period, stats.data.from, stats.data.to) : "…"}
            </p>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={period === "week" ? "Следующая неделя" : "Следующий месяц"}
              disabled={!stats.data?.next}
              onClick={() => stats.data?.next && go({ date: stats.data.next })}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <ToggleGroup
          type="single"
          aria-label="Период"
          value={period}
          onValueChange={(value) => value && go({ period: value as StatsPeriod, date: null })}
          spacing={1}
          className="rounded-full border border-line bg-surface p-1"
        >
          {(
            [
              ["week", "Неделя"],
              ["month", "Месяц"],
            ] as const
          ).map(([value, label]) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="rounded-full px-4 text-ink-muted data-[state=on]:bg-brand/25 data-[state=on]:text-ink"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {stats.isPending ? (
        <Skeleton className="h-[60vh] rounded-3xl bg-surface" />
      ) : stats.isError ? (
        <QueryError error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <StatsBody stats={stats.data} />
      )}
    </section>
  );
}
