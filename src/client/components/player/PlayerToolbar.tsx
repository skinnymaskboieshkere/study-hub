import {
  BookmarkPlus,
  CircleCheck,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAYBACK_RATES } from "@/lib/player";

interface PlayerToolbarProps {
  completed: boolean;
  onToggleCompleted: () => void;
  completionPending: boolean;
  rate: number;
  onRateChange: (rate: number) => void;
  onBookmark: () => void;
  focus: boolean;
  onToggleFocus: () => void;
  previousTo: string | null;
  nextTo: string | null;
}

export function PlayerToolbar(props: PlayerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={props.completed ? "secondary" : "default"}
        onClick={props.onToggleCompleted}
        disabled={props.completionPending}
      >
        <CircleCheck aria-hidden className={props.completed ? "text-success" : undefined} />
        {props.completed ? "Просмотрено" : "Отметить просмотренным"}
      </Button>

      <Select
        value={String(props.rate)}
        onValueChange={(value) => props.onRateChange(Number(value))}
      >
        <SelectTrigger aria-label="Скорость воспроизведения" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLAYBACK_RATES.map((rate) => (
            <SelectItem key={rate} value={String(rate)}>
              {rate}×
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" onClick={props.onBookmark}>
        <BookmarkPlus aria-hidden />
        Закладка
      </Button>
      <Button variant="ghost" onClick={props.onToggleFocus}>
        {props.focus ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
        {props.focus ? "Выйти из фокуса" : "Фокус-режим"}
      </Button>

      <div className="ml-auto flex gap-2">
        {props.previousTo && (
          <Button asChild variant="ghost" size="icon" aria-label="Предыдущее видео">
            <Link to={props.previousTo}>
              <SkipBack />
            </Link>
          </Button>
        )}
        {props.nextTo && (
          <Button asChild variant="outline">
            <Link to={props.nextTo}>
              Следующее видео
              <SkipForward aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
