import { sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "@shared/api";
import type { AppDatabase } from "../db/client";

export const healthRoutes: FastifyPluginAsync<{ db: AppDatabase }> = async (app, { db }) => {
  app.get("/health", async (): Promise<HealthResponse> => {
    // Fails with 500 if the database is not reachable.
    db.get(sql`select 1`);
    return { status: "ok" };
  });
};
