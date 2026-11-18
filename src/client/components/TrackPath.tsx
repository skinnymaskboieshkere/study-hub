import { cn } from "cn";
import { TRACKS } from "@/app/tracks";

/** The four tracks as one path; the last one (Computer Vision) is the goal. */
export function TrackPath({ className }: { className?: string }) {
  const lastIndex = TRACKS.length - 1;

  return (
    <ol
      aria-label="Путь обучения"
      // The single row needs about 650 px; narrower screens get a 2 × 2 grid.
      className={cn("grid grid-cols-2 gap-x-6 gap-y-3 lg:flex lg:items-center lg:gap-0", className)}
    >
      {TRACKS.map((track, index) => {
        const isGoal = index === lastIndex;
        return (
          <li key={track.slug} className="flex items-center gap-2.5 lg:flex-1 lg:last:flex-none">
            <span
              aria-hidden
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                track.dotClass,
                isGoal && "size-3 shadow-[0_0_0_4px_rgb(34_211_238/0.15),0_0_16px_#22d3ee]",
              )}
            />
            <span
              className={cn(
                "text-sm whitespace-nowrap",
                isGoal ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              {track.title}
            </span>
            {!isGoal && (
              <span
                aria-hidden
                className="mx-3 hidden h-px min-w-6 flex-1 bg-linear-to-r from-line to-line/40 lg:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
