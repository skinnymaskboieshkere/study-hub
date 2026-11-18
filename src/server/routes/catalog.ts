import { CollectionUpdateSchema } from "@shared/api";
import type { FastifyPluginAsync } from "fastify";
import { getCourse, setCollection } from "../catalog/catalog-repository";
import {
  getCatalog,
  getContinue,
  getCourseDetail,
  getWatch,
  importCourseVideos,
  ImportError,
} from "../catalog/catalog-service";
import type { AppDatabase } from "../db/client";
import { YouTubeApiError, type YouTubeClient } from "../youtube/client";

interface CatalogRoutesOptions {
  db: AppDatabase;
  /** Absent when .env has no YOUTUBE_API_KEY: importing is then unavailable. */
  youtube?: YouTubeClient;
}

export const catalogRoutes: FastifyPluginAsync<CatalogRoutesOptions> = async (
  app,
  { db, youtube },
) => {
  app.get("/catalog", async () => getCatalog(db));

  app.get<{ Params: { slug: string } }>("/courses/:slug", async (request, reply) => {
    const course = getCourseDetail(db, request.params.slug);
    return course ?? reply.code(404).send({ error: "Курс не найден" });
  });

  app.patch<{ Params: { slug: string } }>("/courses/:slug", async (request, reply) => {
    const body = CollectionUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Неизвестная коллекция" });
    if (!getCourse(db, request.params.slug))
      return reply.code(404).send({ error: "Курс не найден" });
    setCollection(db, request.params.slug, body.data.collection);
    return getCourseDetail(db, request.params.slug);
  });

  app.post<{ Params: { slug: string } }>("/courses/:slug/import", async (request, reply) => {
    if (!youtube) {
      return reply.code(503).send({ error: "Для импорта нужен ключ YouTube API в файле .env" });
    }
    try {
      return await importCourseVideos(db, youtube, request.params.slug);
    } catch (error) {
      if (error instanceof ImportError) return reply.code(400).send({ error: error.message });
      if (error instanceof YouTubeApiError) {
        return reply
          .code(502)
          .send({ error: `YouTube API не ответил: ${error.reason ?? error.status}` });
      }
      throw error;
    }
  });

  app.get<{ Params: { youtubeId: string }; Querystring: { course?: string } }>(
    "/watch/:youtubeId",
    async (request, reply) => {
      const watch = getWatch(db, request.params.youtubeId, request.query.course);
      return watch ?? reply.code(404).send({ error: "Этого видео нет в каталоге" });
    },
  );

  app.get("/continue", async () => ({ item: getContinue(db) }));
};
