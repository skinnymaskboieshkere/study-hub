import { BookOpen, CalendarPlus, ListVideo, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { TRACKS } from "@/app/tracks";
import { FilterChips } from "@/components/FilterChips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

const TRACK_OPTIONS = TRACKS.map((track) => ({
  value: track.slug,
  label: track.title,
  dotClass: track.dotClass,
}));

const COLLECTIONS = [
  { value: "wish", label: "Хочу пройти", count: 3 },
  { value: "active", label: "В процессе", count: 4 },
  { value: "done", label: "Завершено", count: 0 },
  { value: "archive", label: "Архив", count: 1 },
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const TASKS = [
  { id: "t1", title: "Решить задачи 1.1–1.4 из 18.06", done: true },
  { id: "t2", title: "Problem Set 1 из CS50x", done: false },
  { id: "t3", title: "Повторить конспект по термодинамике", done: false },
];

export function ControlsSection() {
  const [tracks, setTracks] = useState<string[]>(["foundation"]);
  const [days, setDays] = useState<string[]>(["Пн", "Вт", "Ср", "Чт", "Пт"]);
  const [doneTasks, setDoneTasks] = useState(
    () => new Set(TASKS.filter((t) => t.done).map((t) => t.id)),
  );

  function toggleTask(id: string, checked: boolean) {
    setDoneTasks((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <ShowcaseSection
      id="controls"
      title="Кнопки и формы"
      description="Белая кнопка-«таблетка» — главное действие на баннере, как на макете. Фиолетовая — главное действие в остальных местах."
    >
      <ShowcaseGroup title="Кнопки">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-hero p-6">
          <Button variant="hero" size="pill">
            <Play aria-hidden className="fill-current" />
            Продолжить обучение
          </Button>
          <Button variant="glass" size="pill">
            <ListVideo aria-hidden />
            Программа курса
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button>
            <CalendarPlus aria-hidden />
            Добавить в план
          </Button>
          <Button variant="secondary">Хочу пройти</Button>
          <Button variant="outline">Импортировать видео</Button>
          <Button variant="ghost">Отмена</Button>
          <Button variant="link">Открыть на YouTube</Button>
          <Button variant="destructive">
            <Trash2 aria-hidden />
            Удалить
          </Button>
          <Button size="icon" variant="ghost" aria-label="Открыть каталог">
            <BookOpen />
          </Button>
          <Button disabled>Недоступно</Button>
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Фильтры каталога и бейджи">
        <FilterChips
          label="Трек"
          options={TRACK_OPTIONS}
          value={tracks}
          onValueChange={setTracks}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>Новое</Badge>
          <Badge variant="secondary">1 курс</Badge>
          <Badge variant="outline">Практика</Badge>
          <Badge variant="outline">CC BY-NC-SA 4.0</Badge>
          <Badge variant="glow">Кандидат</Badge>
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Коллекции">
        <Tabs defaultValue="active">
          {/* On phones the four collections scroll sideways instead of widening the page. */}
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="h-auto rounded-full border border-line bg-surface p-1">
              {COLLECTIONS.map((collection) => (
                <TabsTrigger
                  key={collection.value}
                  value={collection.value}
                  className="rounded-full px-4 py-1.5 data-[state=active]:bg-surface-2 data-[state=active]:text-ink"
                >
                  {collection.label}
                  <span className="font-mono text-xs text-ink-muted">{collection.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {COLLECTIONS.map((collection) => (
            <TabsContent
              key={collection.value}
              value={collection.value}
              className="mt-4 text-ink-muted"
            >
              Здесь будут курсы из коллекции «{collection.label}».
            </TabsContent>
          ))}
        </Tabs>
      </ShowcaseGroup>

      <ShowcaseGroup title="Мастер плана и настройки">
        <div className="grid max-w-3xl gap-6 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="minutes">Минут в день</Label>
            <Input
              id="minutes"
              type="number"
              inputMode="numeric"
              defaultValue={60}
              min={15}
              step={5}
            />
          </div>
          <div className="space-y-2">
            <Label id="subtitles-label">Субтитры</Label>
            <Select defaultValue="ru">
              <SelectTrigger aria-labelledby="subtitles-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русские (автоперевод)</SelectItem>
                <SelectItem value="en">Английские</SelectItem>
                <SelectItem value="off">Без субтитров</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium text-ink" id="days-label">
              Учебные дни
            </p>
            <ToggleGroup
              type="multiple"
              aria-labelledby="days-label"
              value={days}
              onValueChange={setDays}
              spacing={2}
              className="flex-wrap"
            >
              {WEEKDAYS.map((day) => (
                <ToggleGroupItem
                  key={day}
                  value={day}
                  className="size-11 rounded-full border border-line bg-surface-2 text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink"
                >
                  {day}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <Label htmlFor="practice">Включать практические занятия</Label>
            <Switch id="practice" defaultChecked />
          </div>
        </div>
      </ShowcaseGroup>

      <ShowcaseGroup title="Мои задачи">
        <ul className="max-w-xl space-y-1">
          {TASKS.map((task) => {
            const done = doneTasks.has(task.id);
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2"
              >
                <Checkbox
                  id={task.id}
                  checked={done}
                  onCheckedChange={(value) => toggleTask(task.id, value === true)}
                />
                <Label
                  htmlFor={task.id}
                  className={done ? "font-normal text-ink-muted line-through" : "font-normal"}
                >
                  {task.title}
                </Label>
              </li>
            );
          })}
        </ul>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
