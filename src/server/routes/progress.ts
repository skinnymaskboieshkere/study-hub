import { BookmarkCreateSchema, CompletionUpdateSchema, ProgressUpdateSchema } from "@shared/api";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  addBookmark,
  deleteBookmark,
  getBookmarks,
  recordProgress,
  setCompletion,
} from "../catalog/progress-service";
import type { AppDatabase } from "../db/client";

type VideoRequest = FastifyRequest<{ Params: { youtubeId: string } }>;

const NOT_FOUND = { error: "Этого видео нет в каталоге" };

export const progressRoutes: FastifyPluginAsync<{ db: AppDatabase }> = async (app, { db }) => {
  async function saveProgress(request: VideoRequest, reply: FastifyReply) {
    const body = ProgressUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Неверная позиция видео" });
    const progress = recordProgress(db, request.params.youtubeId, body.data.positionSec);
    return progress ?? reply.code(404).send(NOT_FOUND);
  }

  app.put("/progress/:youtubeId", saveProgress);
  // navigator.sendBeacon can only POST; the player uses it when the tab closes (SPEC §9.1).
  app.post("/progress/:youtubeId", saveProgress);

  app.post("/progress/:youtubeId/complete", async (request: VideoRequest, reply) => {
    const body = CompletionUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Ожидалось completed: true/false" });
    const progress = setCompletion(db, request.params.youtubeId, body.data.completed);
    return progress ?? reply.code(404).send(NOT_FOUND);
  });

  app.get("/videos/:youtubeId/bookmarks", async (request: VideoRequest) =>
    getBookmarks(db, request.params.youtubeId),
  );

  app.post("/videos/:youtubeId/bookmarks", async (request: VideoRequest, reply) => {
    const body = BookmarkCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "У закладки нужны время и подпись" });
    const bookmark = addBookmark(db, request.params.youtubeId, body.data.tSec, body.data.label);
    return bookmark ? reply.code(201).send(bookmark) : reply.code(404).send(NOT_FOUND);
  });

  app.delete<{ Params: { id: string } }>("/bookmarks/:id", async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || !deleteBookmark(db, id)) {
      return reply.code(404).send({ error: "Закладка не найдена" });
    }
    return reply.code(204).send();
  });
};
