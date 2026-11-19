import type { RoadmapDto } from "@shared/api";
import { cn } from "cn";
import { getTrack } from "@/app/tracks";
import { RoadmapCourseCard } from "./RoadmapCourseCard";

/** The roadmap as a list by track: for phones and for reading without the map. */
export function RoadmapList({ roadmap }: { roadmap: RoadmapDto }) {
  const tracks = [...roadmap.tracks].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-8">
      {tracks.map((track) => (
        <section key={track.slug} aria-labelledby={`track-${track.slug}`}>
          <h2
            id={`track-${track.slug}`}
            className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
          >
            <span
              aria-hidden
              className={cn("size-2.5 rounded-full", getTrack(track.slug).dotClass)}
            />
            {track.title}
          </h2>
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))] gap-4">
            {roadmap.nodes
              .filter((node) => node.track === track.slug)
              .sort((a, b) => a.order - b.order)
              .map((node) => (
                <li key={node.slug} className="[&>div]:w-full">
                  <RoadmapCourseCard course={node} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
