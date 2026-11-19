import type { RoadmapDto } from "@shared/api";
import { lazy, Suspense, useState } from "react";
import { useRoadmap } from "@/app/queries";
import { QueryError } from "@/components/QueryState";
import { RoadmapLegend } from "@/components/roadmap/RoadmapLegend";
import { RoadmapList } from "@/components/roadmap/RoadmapList";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatHoursLeft } from "@/lib/roadmap";

// React Flow is only needed for the map view.
const RoadmapGraph = lazy(async () => ({
  default: (await import("@/components/roadmap/RoadmapGraph")).RoadmapGraph,
}));

type View = "map" | "list";

function Summary({ roadmap }: { roadmap: RoadmapDto }) {
  const available = roadmap.nodes.filter((node) => node.state === "available").length;
  return (
    <p className="mt-3 max-w-[65ch] text-lg text-ink-muted">
      {roadmap.hoursLeft > 0 ? (
        <>
          До трека Computer Vision осталось{" "}
          <span className="font-semibold text-ink">{formatHoursLeft(roadmap.hoursLeft)}</span> по
          рекомендованному пути.
        </>
      ) : (
        "Пререквизиты пройдены — трек Computer Vision открыт."
      )}{" "}
      Можно начинать: {available}.
    </p>
  );
}

/** "Траектории": the roadmap of four tracks with soft prerequisites (SPEC §6.3). */
export function RoadmapPage() {
  const roadmap = useRoadmap();
  const [view, setView] = useState<View>("map");

  return (
    <section className="space-y-5 pt-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Траектории
          </h1>
          {roadmap.data ? (
            <Summary roadmap={roadmap.data} />
          ) : (
            <Skeleton className="mt-3 h-6 w-96 max-w-full bg-surface" />
          )}
        </div>
        <ToggleGroup
          type="single"
          aria-label="Вид"
          value={view}
          onValueChange={(value) => value && setView(value as View)}
          spacing={1}
          className="rounded-full border border-line bg-surface p-1"
        >
          {(
            [
              ["map", "Карта"],
              ["list", "Списком"],
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

      <RoadmapLegend />

      {roadmap.isPending ? (
        <Skeleton className="h-[70vh] rounded-3xl bg-surface" />
      ) : roadmap.isError ? (
        <QueryError error={roadmap.error} onRetry={() => void roadmap.refetch()} />
      ) : view === "map" ? (
        <div className="h-[max(480px,calc(100dvh-17rem))] overflow-hidden rounded-3xl border border-line bg-surface/40">
          <Suspense fallback={<Skeleton className="size-full bg-surface" />}>
            <RoadmapGraph roadmap={roadmap.data} />
          </Suspense>
        </div>
      ) : (
        <RoadmapList roadmap={roadmap.data} />
      )}
    </section>
  );
}
