import type { CalendarDto } from "@shared/api";
import { fromIsoDate } from "@shared/dates";
import { cn } from "cn";
import { totalLength } from "@/lib/calendar";
import { formatDuration } from "@/lib/format";
import { WEEKDAYS } from "@/lib/plan";
import { CalendarPart } from "./CalendarPart";

/** Seven days in columns (a list on phones) with every part of the plan. */
export function WeekView({ days, today }: { days: CalendarDto["days"]; today: string }) {
  return (
    <ol className="grid grid-cols-1 gap-3 lg:grid-cols-7">
      {days.map((day, index) => {
        const total = totalLength(day.items);
        const isToday = day.date === today;
        return (
          <li
            key={day.date}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex flex-col rounded-2xl border bg-surface p-3 lg:min-h-48",
              isToday ? "border-lilac/50" : "border-line",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn("text-sm", isToday ? "font-semibold text-ink" : "text-ink-muted")}
              >
                {WEEKDAYS[index]?.short}, {fromIsoDate(day.date).getDate()}
              </span>
              {total > 0 && (
                <span className="font-mono text-xs text-ink-muted">{formatDuration(total)}</span>
              )}
            </div>
            {day.items.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {day.items.map((item) => (
                  <li key={item.id}>
                    <CalendarPart item={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ink-muted/70">без учёбы</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
