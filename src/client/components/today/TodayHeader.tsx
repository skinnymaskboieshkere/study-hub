import type { TodayDto } from "@shared/api";
import { CalendarDays, Flame, NotebookPen, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useReplan } from "@/app/queries";
import { ProgressRing } from "@/components/course/ProgressRing";
import { useOpenDailyNote } from "@/components/notes/useOpenDailyNote";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDuration, pluralRu } from "@/lib/format";
import { formatDayTitle } from "@/lib/plan";

/** Date, how much of today's plan is done, the streak and plan actions (SPEC §6.4). */
export function TodayHeader({ today }: { today: TodayDto }) {
  const share = today.plannedSec > 0 ? today.doneSec / today.plannedSec : 0;
  const daily = useOpenDailyNote();
  const finished = today.plannedSec > 0 && today.doneSec >= today.plannedSec;

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-muted">{formatDayTitle(today.date)}</p>
        <h2 id="today-title" className="mt-1 text-2xl font-semibold text-ink">
          План на сегодня
        </h2>
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          {today.plannedSec > 0 && (
            <span className="inline-flex items-center gap-2">
              <ProgressRing value={share} size={22} strokeWidth={3} showValue={false} />
              {finished ? (
                <span className="text-success">Всё на сегодня сделано</span>
              ) : (
                <span>
                  Сделано{" "}
                  <span className="font-mono text-ink">{formatDuration(today.doneSec)}</span> из{" "}
                  <span className="font-mono">{formatDuration(today.plannedSec)}</span>
                </span>
              )}
            </span>
          )}
          {today.studiedSec >= 60 && (
            <span>
              В плеере сегодня:{" "}
              <span className="font-mono text-ink">{formatDuration(today.studiedSec)}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Flame aria-hidden className={today.streak > 0 ? "size-4 text-warning" : "size-4"} />
            {today.streak > 0
              ? `${today.streak} ${pluralRu(today.streak, ["день", "дня", "дней"])} подряд`
              : "Серия начнётся с первой части"}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* SPEC §6.4: the Today screen links to the daily note. */}
        <Button variant="ghost" disabled={daily.pending} onClick={() => daily.open(today.date)}>
          <NotebookPen aria-hidden />
          Дневная заметка
        </Button>
        <Button asChild variant="ghost">
          <Link to="/calendar">
            <CalendarDays aria-hidden />
            Календарь
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/plan">
            <SlidersHorizontal aria-hidden />
            {today.plan ? "Изменить план" : "Составить план"}
          </Link>
        </Button>
        {today.plan && <ReplanButton />}
      </div>
    </div>
  );
}

/** "Перепланировать" (SPEC §6.4) with a confirmation: it rebuilds every future day. */
function ReplanButton() {
  const replan = useReplan();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={replan.isPending}>
          <RefreshCw aria-hidden />
          Перепланировать
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перепланировать?</DialogTitle>
          <DialogDescription>
            План пересоберётся с сегодняшнего дня по тому, что уже просмотрено: невыполненное
            переедет вперёд, остальное сдвинется. Сделанные части останутся на своих днях.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Отмена</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onClick={() =>
                replan.mutate(undefined, {
                  onSuccess: () => toast.success("План пересобран"),
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              Перепланировать
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
