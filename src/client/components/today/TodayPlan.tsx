import type { TodayDto } from "@shared/api";
import { CalendarDays, CalendarPlus, Coffee, PartyPopper } from "lucide-react";
import { Link } from "react-router";
import { KIND_LABEL } from "@/app/labels";
import { PlanItemCard } from "@/components/course/PlanItemCard";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { watchUrlForItem } from "@/lib/plan";
import { TodayHeader } from "./TodayHeader";

/** "План на сегодня": the day's parts, each opening the player on its segment (SPEC §6.4). */
export function TodayPlan({ today }: { today: TodayDto }) {
  return (
    <section aria-labelledby="today-title" className="mt-12">
      <TodayHeader today={today} />
      <div className="mt-5">
        {today.items.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {today.items.map((item) => (
              <li key={item.id}>
                <PlanItemCard
                  courseShortTitle={
                    item.kind === "lecture"
                      ? item.courseShortTitle
                      : `${item.courseShortTitle} · ${KIND_LABEL[item.kind]}`
                  }
                  lessonTitle={item.lessonTitle}
                  track={item.track}
                  videoId={item.coverVideoId}
                  startSeconds={item.startSec}
                  endSeconds={item.endSec}
                  done={item.status === "done"}
                  to={watchUrlForItem(item)}
                  className="h-full"
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyDay today={today} />
        )}
      </div>
    </section>
  );
}

function EmptyDay({ today }: { today: TodayDto }) {
  if (!today.plan) {
    return (
      <StateMessage
        icon={CalendarPlus}
        title="Плана пока нет"
        action={
          <Button asChild>
            <Link to="/plan">Составить план</Link>
          </Button>
        }
      >
        Мастер разложит лекции и практику выбранных курсов по учебным дням: около часа в день, 1–2
        предмета по очереди.
      </StateMessage>
    );
  }
  if (!today.plan.endDate) {
    return (
      <StateMessage
        icon={PartyPopper}
        title="Все курсы плана пройдены"
        action={
          <Button asChild>
            <Link to="/plan">Добавить курсы</Link>
          </Button>
        }
      >
        Лекции из плана просмотрены. Возьми следующие курсы по дорожной карте — мастер разложит их
        по дням.
      </StateMessage>
    );
  }
  return (
    <StateMessage
      icon={Coffee}
      title="Сегодня учёбы по плану нет"
      action={
        <Button asChild variant="secondary">
          <Link to="/calendar">
            <CalendarDays aria-hidden />
            Календарь
          </Link>
        </Button>
      }
    >
      Выходной или день без учёбы. Ближайшие части — в календаре; если хочется, можно посмотреть их
      и сегодня.
    </StateMessage>
  );
}
