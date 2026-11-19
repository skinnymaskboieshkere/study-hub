import type { FastifyPluginAsync } from "fastify";
import type { AppDatabase } from "../db/client";
import { getRoadmap } from "../roadmap/roadmap-service";

/** The roadmap of courses (SPEC §6.3). */
export const roadmapRoutes: FastifyPluginAsync<{ db: AppDatabase }> = async (app, { db }) => {
  app.get("/roadmap", async () => getRoadmap(db));
};
