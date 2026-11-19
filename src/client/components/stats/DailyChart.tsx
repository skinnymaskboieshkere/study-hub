import type { StatsDto } from "@shared/api";
import type { TrackSlug } from "@shared/catalog";
import { todayIso } from "@shared/dates";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/format";
import { dayLabel, longDay, minuteTicks } from "@/lib/stats";

/**
 * Minutes studied per day (SPEC §6.7): one series of columns on recessive gridlines.
 * Hovering a day shows its tracks; the same numbers are in a table for screen readers.
 */
export function DailyChart({ stats }: { stats: StatsDto }) {
  const minutes = stats.days.map((day) => day.seconds / 60);
  const ticks = minuteTicks(Math.max(0, ...minutes));
  const top = ticks[ticks.length - 1] ?? 60;
  const today = todayIso();
  const titles = new Map(stats.byTrack.map((track) => [track.slug, track.title]));

  return (
    <figure>
      <div className="flex h-56 gap-3">
        {/* Y axis: minute ticks, aligned with the gridlines. */}
        <div aria-hidden className="relative w-10 shrink-0 font-mono text-xs text-ink-muted">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 h-px bg-line/70"
              style={{ bottom: `${(tick / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {stats.days.map((day, index) => {
              const value = minutes[index] ?? 0;
              const tracks = (Object.entries(day.byTrack) as [TrackSlug, number][]).filter(
                ([, seconds]) => seconds > 0,
              );
              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    {/* The whole slot of the day is the hover target, not only the column. */}
                    <div className="group flex h-full min-w-0 flex-1 items-end justify-center">
                      {value > 0 && (
                        <div
                          className="w-full max-w-6 rounded-t-[4px] bg-brand transition-colors duration-150 group-hover:bg-lilac"
                          style={{ height: `${Math.max(1, (value / top) * 100)}%` }}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{longDay(day.date)}</p>
                    <p>{value > 0 ? formatDuration(day.seconds) : "без учёбы"}</p>
                    {tracks.map(([slug, seconds]) => (
                      <p key={slug} className="opacity-80">
                        {titles.get(slug) ?? slug} — {formatDuration(seconds)}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
      <div aria-hidden className="mt-2 flex gap-0.5 pl-[3.25rem] text-xs text-ink-muted">
        {stats.days.map((day, index) => (
          <span
            key={day.date}
            className={cn(
              "min-w-0 flex-1 text-center",
              day.date === today && "font-semibold text-ink",
              // A month has 30 columns: every other label, so they never collide.
              stats.period === "month" && index % 2 === 1 && "invisible",
            )}
          >
            {dayLabel(stats.period, day.date)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Минуты учёбы по дням</caption>
        <tbody>
          {stats.days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{longDay(day.date)}</th>
              <td>{formatDuration(day.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
