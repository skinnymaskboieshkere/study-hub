import type { TaskDto } from "@shared/api";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { tasks } from "../db/schema";

function toDto(row: typeof tasks.$inferSelect): TaskDto {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    done: row.done,
    createdAt: row.createdAt,
    doneAt: row.doneAt,
  };
}

/** Tasks for a day, plus unfinished ones from earlier days and those without a date. */
export function listTasks(db: AppDatabase, date: string): TaskDto[] {
  return db
    .select()
    .from(tasks)
    .where(
      or(
        eq(tasks.date, date),
        and(eq(tasks.done, false), or(isNull(tasks.date), lt(tasks.date, date))),
      ),
    )
    .orderBy(asc(tasks.done), asc(tasks.date), asc(tasks.id))
    .all()
    .map(toDto);
}

export function createTask(db: AppDatabase, title: string, date: string | null): TaskDto {
  const [row] = db
    .insert(tasks)
    .values({ title, date, done: false, createdAt: new Date().toISOString() })
    .returning()
    .all();
  if (!row) throw new Error("task was not created");
  return toDto(row);
}

export function updateTask(
  db: AppDatabase,
  id: number,
  changes: { title?: string; done?: boolean; date?: string | null },
): TaskDto | undefined {
  const current = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!current) return undefined;
  const done = changes.done ?? current.done;
  const [row] = db
    .update(tasks)
    .set({
      title: changes.title ?? current.title,
      date: changes.date === undefined ? current.date : changes.date,
      done,
      doneAt: done ? (current.doneAt ?? new Date().toISOString()) : null,
    })
    .where(eq(tasks.id, id))
    .returning()
    .all();
  return row ? toDto(row) : undefined;
}

export function deleteTask(db: AppDatabase, id: number): boolean {
  return db.delete(tasks).where(eq(tasks.id, id)).returning().all().length > 0;
}
