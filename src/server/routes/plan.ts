import { ItemUpdateSchema, PlanInputSchema } from "@shared/api";
import { addDays, daysBetween, todayIso } from "@shared/dates";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppDatabase } from "../db/client";
import { getPlanDto, PlanError, replan, savePlan, setItemDone } from "../plan/plan-service";
import { getCalendar, getItem, getToday } from "../plan/plan-views";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** `?date=` lets the Today screen be opened for another day (acceptance checks). */
function dateParam(value: unknown): string | undefined {
  if (value === undefined) return todayIso();
  const parsed = DateSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export const planRoutes: FastifyPluginAsync<{ db: AppDatabase }> = async (app, { db }) => {
  app.get("/plan", async () => ({ plan: getPlanDto(db) ?? null }));

  app.put("/plan", async (request, reply) => {
    const body = PlanInputSchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: "План заполнен не полностью: проверь дни, минуты и курсы" });
    }
    try {
      return savePlan(db, body.data);
    } catch (error) {
      if (error instanceof PlanError) return reply.code(400).send({ error: error.message });
      throw error;
    }
  });

  app.post<{ Querystring: { date?: string } }>("/plan/replan", async (request, reply) => {
    const date = dateParam(request.query.date);
    if (!date) return reply.code(400).send({ error: "Неверная дата" });
    return { parts: replan(db, date) };
  });

  app.get<{ Querystring: { date?: string } }>("/today", async (request, reply) => {
    const date = dateParam(request.query.date);
    if (!date) return reply.code(400).send({ error: "Неверная дата" });
    return getToday(db, date);
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/calendar", async (request, reply) => {
    const from = DateSchema.safeParse(request.query.from);
    const to = DateSchema.safeParse(request.query.to);
    if (!from.success || !to.success || daysBetween(from.data, to.data) < 0) {
      return reply.code(400).send({ error: "Нужны даты from и to" });
    }
    // Two months at most: enough for the month view.
    const end = daysBetween(from.data, to.data) > 62 ? addDays(from.data, 62) : to.data;
    return getCalendar(db, from.data, end);
  });

  app.post<{ Params: { id: string } }>("/plan/items/:id", async (request, reply) => {
    const body = ItemUpdateSchema.safeParse(request.body);
    const id = Number(request.params.id);
    if (!body.success || !Number.isInteger(id))
      return reply.code(400).send({ error: "Ожидалось done: true/false" });
    if (!setItemDone(db, id, body.data.done))
      return reply.code(404).send({ error: "Пункт плана не найден" });
    return getItem(db, id);
  });
};
