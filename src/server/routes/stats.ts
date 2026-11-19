import { todayIso } from "@shared/dates";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppDatabase } from "../db/client";
import type { NotesService } from "../notes/notes-service";
import { getStats } from "../stats/stats-service";

const StatsQuerySchema = z.object({
  period: z.enum(["week", "month"]).default("week"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Statistics (SPEC §6.7). */
export const statsRoutes: FastifyPluginAsync<{ db: AppDatabase; notes: NotesService }> = async (
  app,
  { db, notes },
) => {
  app.get("/stats", async (request, reply) => {
    const query = StatsQuerySchema.safeParse(request.query);
    if (!query.success)
      return reply.code(400).send({ error: "Ожидалось period=week|month и date=ГГГГ-ММ-ДД" });
    return getStats(db, query.data.period, query.data.date ?? todayIso(), {
      vaultConnected: notes.status().available,
    });
  });
};
