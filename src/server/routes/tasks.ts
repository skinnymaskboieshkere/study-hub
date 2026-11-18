import { TaskCreateSchema, TaskUpdateSchema } from "@shared/api";
import { todayIso } from "@shared/dates";
import type { FastifyPluginAsync } from "fastify";
import type { AppDatabase } from "../db/client";
import { createTask, deleteTask, listTasks, updateTask } from "../plan/tasks-service";

/** "Мои задачи" on the Today screen (SPEC §6.4). */
export const taskRoutes: FastifyPluginAsync<{ db: AppDatabase }> = async (app, { db }) => {
  app.get<{ Querystring: { date?: string } }>("/tasks", async (request) =>
    listTasks(db, request.query.date ?? todayIso()),
  );

  app.post("/tasks", async (request, reply) => {
    const body = TaskCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "У задачи нужен текст" });
    return reply.code(201).send(createTask(db, body.data.title, body.data.date));
  });

  app.patch<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const body = TaskUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Неверные данные задачи" });
    const task = updateTask(db, Number(request.params.id), body.data);
    return task ?? reply.code(404).send({ error: "Задача не найдена" });
  });

  app.delete<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    if (!deleteTask(db, Number(request.params.id))) {
      return reply.code(404).send({ error: "Задача не найдена" });
    }
    return reply.code(204).send();
  });
};
