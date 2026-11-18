import { BookmarkPlus, CalendarPlus, ChevronDown, ExternalLink, VideoOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RoadmapNode } from "@/components/roadmap/RoadmapNode";
import { StateMessage } from "@/components/StateMessage";
import { Timecode } from "@/components/Timecode";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { youtubeWatchUrl } from "@/lib/youtube";
import { SAMPLE_BOOKMARKS, SAMPLE_VIDEO } from "../sample";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

const COLLECTION_LABELS: Record<string, string> = {
  wish: "Хочу пройти",
  active: "В процессе",
  done: "Завершено",
  archive: "Архив",
};

export function FeedbackSection() {
  const [collection, setCollection] = useState("active");

  function moveTo(value: string) {
    setCollection(value);
    toast.success(`Курс перенесён в «${COLLECTION_LABELS[value]}»`);
  }

  return (
    <ShowcaseSection
      id="feedback"
      title="Сообщения, окна и дорожная карта"
      description="Пустой раздел подсказывает, что сделать дальше. Ошибка объясняет, что случилось и как это обойти."
    >
      <ShowcaseGroup title="Пусто и ошибка">
        <div className="grid gap-4 lg:grid-cols-2">
          <StateMessage
            icon={BookmarkPlus}
            title="В «Хочу пройти» пока пусто"
            action={<Button variant="secondary">Открыть каталог</Button>}
          >
            Отмечай курсы в каталоге кнопкой «Хочу пройти» — они соберутся здесь.
          </StateMessage>
          <StateMessage
            tone="error"
            icon={VideoOff}
            title="Это видео нельзя показать в приложении"
            action={
              <Button asChild variant="secondary">
                <a
                  href={youtubeWatchUrl(SAMPLE_VIDEO.cs50xLecture0)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть на YouTube
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            }
          >
            Автор запретил встраивание (ошибка 150). Посмотри видео на YouTube и отметь лекцию
            вручную.
          </StateMessage>
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Загрузка">
        <div className="grid gap-5 sm:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((key) => (
            <div key={key} className="rounded-2xl border border-line bg-surface p-3">
              <Skeleton className="aspect-video rounded-xl bg-surface-2" />
              <Skeleton className="mt-3 h-4 w-4/5 bg-surface-2" />
              <Skeleton className="mt-2 h-3 w-1/2 bg-surface-2" />
            </div>
          ))}
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Меню, подсказка, окно, уведомление">
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {COLLECTION_LABELS[collection]}
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuRadioGroup value={collection} onValueChange={moveTo}>
                {Object.entries(COLLECTION_LABELS).map(([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Добавить в план">
                <CalendarPlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Добавить в план</TooltipContent>
          </Tooltip>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Перепланировать</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Перепланировать?</DialogTitle>
                <DialogDescription>
                  Невыполненные части прошлых дней переедут на ближайшие учебные дни, остальной план
                  сдвинется.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Отмена</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={() => toast.success("План перепланирован")}>
                    Перепланировать
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Таймкоды и закладки">
        <ul className="max-w-md space-y-1 rounded-2xl border border-line bg-surface p-2">
          {SAMPLE_BOOKMARKS.map((bookmark) => (
            <li
              key={bookmark.seconds}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2"
            >
              <Timecode
                seconds={bookmark.seconds}
                onSeek={() => toast(`Перемотка на ${bookmark.label}`)}
              />
              <span className="text-ink">{bookmark.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-xs break-all text-ink-muted">
          В конспекте: [▶ 12:34]({youtubeWatchUrl(SAMPLE_VIDEO.cs50xLecture0, 754)})
        </p>
      </ShowcaseGroup>

      <ShowcaseGroup title="Узлы дорожной карты">
        <div className="flex flex-wrap gap-4">
          <RoadmapNode
            title="18.06 Linear Algebra"
            university="MIT"
            track="foundation"
            state="in-progress"
            progress={0.4}
          />
          <RoadmapNode
            title="First Principles of Computer Vision"
            university="Columbia"
            track="cv"
            state="available"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <div tabIndex={0} className="rounded-2xl">
                <RoadmapNode
                  title="EECS 498: Deep Learning for CV"
                  university="Michigan"
                  track="cv"
                  state="wait"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Рекомендуется сначала пройти 18.06 — сейчас 40% из 60%</TooltipContent>
          </Tooltip>
          <RoadmapNode
            title="CS50x: Introduction to CS"
            university="Harvard"
            track="foundation"
            state="done"
          />
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
