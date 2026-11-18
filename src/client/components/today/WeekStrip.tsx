import type { TodayDto } from "@shared/api";
import { fromIsoDate } from "@shared/dates";
import { cn } from "cn";
import { Link } from "react-router";
import { getTrack } from "@/app/tracks";
import { WEEKDAYS } from "@/lib/plan";

/** This week at a glance: planned minutes per day and which tracks (SPEC §6.4 calendar). */
export function WeekStrip({ week, today }: { week: TodayDto["week"]; today: string }) {
  const maxSec = Math.max(...week.map((day) => day.plannedSec), 1);
  return (
    <section aria-labelledby="week-title" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="week-title" className="text-xl font-semibold text-ink">
          Неделя
        </h2>
        <Link to="/calendar" className="text-sm text-lilac underline-offset-4 hover:underline">
          Календарь
        </Link>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-2">
        {week.map((day, index) => {
          const minutes = Math.round(day.plannedSec / 60);
          const isToday = day.date === today;
          return (
            <li key={day.date} className="flex flex-col items-center gap-2">
              <span
                className={cn("text-xs", isToday ? "font-semibold text-ink" : "text-ink-muted")}
              >
                {WEEKDAYS[index]?.short}
              </span>
              <div
                className={cn(
                  "relative flex h-20 w-full items-end overflow-hidden rounded-lg bg-surface-2",
                  isToday && "ring-1 ring-lilac/50",
                )}
                title={minutes > 0 ? `${minutes} мин` : "без учёбы"}
              >
                {day.plannedSec > 0 && (
                  <div
                    className="flex w-full flex-col justify-end bg-brand/30"
                    style={{ height: `${(day.plannedSec / maxSec) * 100}%` }}
                  >
                    <div
                      className="w-full bg-lilac/70"
                      style={{
                        height: `${day.plannedSec > 0 ? (day.doneSec / day.plannedSec) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <span className="flex h-2 gap-0.5" aria-hidden>
                {day.tracks.map((track) => (
                  <span
                    key={track}
                    className={cn("size-1.5 rounded-full", getTrack(track).dotClass)}
                  />
                ))}
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                {fromIsoDate(day.date).getDate()}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
