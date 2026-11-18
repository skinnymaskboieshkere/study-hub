import { cn } from "cn";
import { getTrack, type TrackSlug } from "@/app/tracks";

export function TrackBadge({ track, className }: { track: TrackSlug; className?: string }) {
  const info = getTrack(track);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-night/75 px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-white/10 backdrop-blur-sm",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", info.dotClass)} />
      {info.title}
    </span>
  );
}
