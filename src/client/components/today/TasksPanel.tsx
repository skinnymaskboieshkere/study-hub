import { addDays } from "@shared/dates";
import { CalendarArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/app/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/plan";

/** "Мои задачи": add, tick, move to tomorrow (SPEC §6.4). */
export function TasksPanel({ date }: { date: string }) {
  const tasks = useTasks(date);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [title, setTitle] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = title.trim();
    if (!text) return;
    create.mutate(
      { title: text, date },
      { onSuccess: () => setTitle(""), onError: (error) => toast.error(error.message) },
    );
  }

  const tomorrow = addDays(date, 1);

  return (
    <section
      aria-labelledby="tasks-title"
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <h2 id="tasks-title" className="text-xl font-semibold text-ink">
        Мои задачи
      </h2>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например: Problem Set 1 из CS50x"
          aria-label="Новая задача"
          maxLength={300}
        />
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          <Plus aria-hidden />
          Добавить
        </Button>
      </form>

      {tasks.data && tasks.data.length > 0 ? (
        <ul className="mt-3 space-y-0.5">
          {tasks.data.map((task) => (
            <li
              key={task.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2"
            >
              <Checkbox
                id={`task-${task.id}`}
                checked={task.done}
                onCheckedChange={(value) => update.mutate({ id: task.id, done: value === true })}
              />
              <label
                htmlFor={`task-${task.id}`}
                className={task.done ? "flex-1 text-ink-muted line-through" : "flex-1 text-ink"}
              >
                {task.title}
                {task.date && task.date < date && !task.done && (
                  <span className="ml-2 text-xs text-warning">с {formatShortDate(task.date)}</span>
                )}
              </label>
              {!task.done && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Перенести «${task.title}» на завтра`}
                  title="Перенести на завтра"
                  onClick={() =>
                    update.mutate(
                      { id: task.id, date: tomorrow },
                      {
                        onSuccess: () =>
                          toast.success(`Перенесено на ${formatShortDate(tomorrow)}`),
                      },
                    )
                  }
                  className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <CalendarArrowUp />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Удалить «${task.title}»`}
                onClick={() => remove.mutate(task.id)}
                className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Здесь — всё, что не видео: задачи, конспект, подготовка к паре.
        </p>
      )}
    </section>
  );
}
