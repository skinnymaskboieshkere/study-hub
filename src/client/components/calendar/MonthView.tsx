import type { CalendarDto } from "@shared/api";
import { fromIsoDate } from "@shared/dates";
import { cn } from "cn";
import { SUBJECT_COLOR } from "@/app/labels";
import { totalLength } from "@/lib/calendar";
import { formatDuration } from "@/lib/format";
import { formatDayTitle, WEEKDAYS } from "@/lib/plan";

interface MonthViewProps {
  days: CalendarDto["days"];
  /** "2026-11": days of other months are dimmed. */
  month: string;
  today: string;
  /** A day was picked: show its week. */
  onPickDay: (date: string) => void;
}

/** The month as a grid of weeks: subject-colored parts per day (dots on phones). */
export function MonthView({ days, month, today, onPickDay }: MonthViewProps) {
  return (
    <div>
      <div aria-hidden className="grid grid-cols-7 gap-1.5 text-center text-xs text-ink-muted">
        {WEEKDAYS.map((day) => (
          <span key={day.value}>{day.short}</span>
        ))}
      </div>
      <ol className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const total = totalLength(day.items);
          const isToday = day.date === today;
          return (
            <li key={day.date}>
              <button
                type="button"
                onClick={() => onPickDay(day.date)}
                aria-label={`${formatDayTitle(day.date)}: ${total > 0 ? formatDuration(total) : "без учёбы"}`}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex h-full min-h-16 w-full flex-col rounded-xl border bg-surface p-1.5 text-left transition-colors duration-150 hover:border-lilac/40 sm:min-h-28 sm:p-2",
                  isToday ? "border-lilac/50" : "border-line",
                  !day.date.startsWith(month) && "opacity-40",
                )}
              >
                <span
                  className={cn("text-xs", isToday ? "font-semibold text-ink" : "text-ink-muted")}
                >
                  {fromIsoDate(day.date).getDate()}
                </span>
                <span className="mt-1.5 hidden space-y-1 sm:block">
                  {day.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "block truncate rounded px-1.5 py-0.5 text-[11px] text-ink",
                        item.status === "done" && "opacity-50",
                      )}
                      style={{
                        background: `color-mix(in oklab, ${SUBJECT_COLOR[item.subject].color} 24%, transparent)`,
                      }}
                    >
                      {item.courseShortTitle}
                    </span>
                  ))}
                  {day.items.length > 3 && (
                    <span className="block text-[11px] text-ink-muted">
                      ещё {day.items.length - 3}
                    </span>
                  )}
                </span>
                <span className="mt-auto flex flex-wrap gap-0.5 pt-1 sm:hidden">
                  {day.items.map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        SUBJECT_COLOR[item.subject].dotClass,
                        item.status === "done" && "opacity-50",
                      )}
                    />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
