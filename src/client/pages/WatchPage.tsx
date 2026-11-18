import { Link, useParams, useSearchParams } from "react-router";
import { useWatch } from "@/app/queries";
import { StudyScreen } from "@/components/player/StudyScreen";
import { QueryError } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { parseSegment } from "@/lib/segment";

/** /watch/:youtubeId?course=slug[&focus=1][&from=&to=&item= — a part of the day's plan] */
export function WatchPage() {
  const { youtubeId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const courseSlug = params.get("course") ?? undefined;
  const focus = params.get("focus") === "1";
  const segment = parseSegment(params);
  const watch = useWatch(youtubeId, courseSlug);

  function toggleFocus() {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (next.get("focus") === "1") next.delete("focus");
        else next.set("focus", "1");
        return next;
      },
      { replace: true },
    );
  }

  if (watch.isPending) {
    return (
      <div aria-hidden className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="aspect-video rounded-2xl bg-surface" />
        <Skeleton className="h-96 rounded-2xl bg-surface" />
      </div>
    );
  }
  if (watch.isError) {
    return (
      <div className="pt-8">
        <QueryError error={watch.error} onRetry={() => void watch.refetch()} />
        <Link
          to="/courses"
          className="mt-4 inline-block text-lilac underline-offset-4 hover:underline"
        >
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  // A new key per video (and plan part) resets the player and its state on moving on.
  return (
    <StudyScreen
      key={`${watch.data.video.youtubeId}:${segment?.itemId ?? ""}`}
      watch={watch.data}
      segment={segment}
      focus={focus}
      onToggleFocus={toggleFocus}
    />
  );
}
