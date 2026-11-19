import {
  DailyNoteSchema,
  FolderCreateSchema,
  LectureNoteCreateSchema,
  NoteCreateSchema,
  NoteSaveSchema,
  RenameSchema,
  RestoreSchema,
} from "@shared/api";
import { normalizeTag } from "@shared/notes";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { AppDatabase } from "../db/client";
import {
  backlinks,
  lectureNoteFor,
  notedVideoIds,
  notesWithTag,
  searchNotes,
  tagCounts,
  videoNotes,
} from "../notes/note-index";
import { NoteConflictError, type NotesService } from "../notes/notes-service";
import { VaultError } from "../notes/vault";

/** Vault errors become readable answers; anything else is a real server error. */
function fail(reply: FastifyReply, error: unknown) {
  if (error instanceof NoteConflictError) {
    return reply.code(409).send({ error: error.message, current: error.current });
  }
  if (error instanceof VaultError) return reply.code(error.status).send({ error: error.message });
  throw error;
}

type PathQuery = { Querystring: { path?: string } };

/** Notes in the Obsidian vault (SPEC §6.5). */
export const notesRoutes: FastifyPluginAsync<{ db: AppDatabase; notes: NotesService }> = async (
  app,
  { db, notes },
) => {
  app.get("/notes/status", async () => notes.status());

  app.get("/notes/version", async () => ({ version: notes.version }));

  app.get("/notes/tree", async (_request, reply) =>
    notes.tree().catch((error) => fail(reply, error)),
  );

  app.get("/notes/list", async (_request, reply) => {
    try {
      return notes.list();
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.get<PathQuery>("/notes/file", async (request, reply) =>
    notes.read(request.query.path ?? "").catch((error) => fail(reply, error)),
  );

  const save = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = NoteSaveSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Неверные данные заметки" });
    return notes
      .save(body.data.path, body.data.content, body.data.baseHash)
      .catch((error) => fail(reply, error));
  };
  app.put("/notes/file", save);
  // sendBeacon can only POST: the last save when the tab closes.
  app.post("/notes/file", save);

  app.post("/notes", async (request, reply) => {
    const body = NoteCreateSchema.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "Неверное имя заметки" });
    return notes
      .create(body.data.folder, body.data.name || undefined)
      .then((note) => reply.code(201).send(note))
      .catch((error) => fail(reply, error));
  });

  app.post("/notes/folders", async (request, reply) => {
    const body = FolderCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Нужно имя папки" });
    return notes
      .createFolder(body.data.parent, body.data.name)
      .then((created) => reply.code(201).send({ path: created }))
      .catch((error) => fail(reply, error));
  });

  app.delete<PathQuery>("/notes/file", async (request, reply) =>
    notes
      .trash(request.query.path ?? "")
      .then((trashedTo) => ({ trashedTo }))
      .catch((error) => fail(reply, error)),
  );

  // ── Video ↔ notes (SPEC §6.6) ──
  app.get<{ Querystring: { video?: string } }>("/notes/lecture", async (request) => ({
    path: lectureNoteFor(db, request.query.video ?? ""),
    created: false,
  }));

  app.post("/notes/lecture", async (request, reply) => {
    const body = LectureNoteCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Неверное видео" });
    return notes
      .lectureNote(body.data.youtubeId, body.data.course)
      .then((note) => reply.code(note.created ? 201 : 200).send(note))
      .catch((error) => fail(reply, error));
  });

  app.get<{ Querystring: { video?: string } }>("/notes/video", async (request) =>
    videoNotes(db, request.query.video ?? ""),
  );

  app.get("/notes/noted-videos", async () => notedVideoIds(db));

  app.post("/notes/daily", async (request, reply) => {
    const body = DailyNoteSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Нужна дата YYYY-MM-DD" });
    return notes
      .dailyNote(body.data.date)
      .then((note) => reply.code(note.created ? 201 : 200).send(note))
      .catch((error) => fail(reply, error));
  });

  app.get("/notes/templates", async (_request, reply) =>
    notes.templates().catch((error) => fail(reply, error)),
  );

  // ── Rename, trash, pictures, graph (SPEC §6.5, stage 5) ──
  app.post("/notes/rename", async (request, reply) => {
    const body = RenameSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Нужны старое и новое имя" });
    return notes.rename(body.data.from, body.data.to).catch((error) => fail(reply, error));
  });

  app.get("/notes/folders", async (_request, reply) =>
    notes.folders().catch((error) => fail(reply, error)),
  );

  app.get("/notes/trash", async (_request, reply) =>
    notes.trashList().catch((error) => fail(reply, error)),
  );

  app.post("/notes/trash/restore", async (request, reply) => {
    const body = RestoreSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Неверный файл" });
    return notes
      .restore(body.data.name, body.data.folder)
      .then((path) => ({ path }))
      .catch((error) => fail(reply, error));
  });

  app.delete<{ Querystring: { name?: string } }>("/notes/trash", async (request, reply) =>
    notes
      .purge(request.query.name ?? "")
      .then(() => reply.code(204).send())
      .catch((error) => fail(reply, error)),
  );

  // Pasted pictures come as raw bytes (Content-Type: image/png …), up to 20 MB.
  app.addContentTypeParser(
    /^image[/]/,
    { parseAs: "buffer", bodyLimit: 20 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );

  app.post("/notes/attachments", async (request, reply) => {
    const type =
      String(request.headers["content-type"] ?? "")
        .split(";")[0]
        ?.trim() ?? "";
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      return reply.code(400).send({ error: "Нужна картинка" });
    }
    return notes
      .attach(request.body, type)
      .then((saved) => reply.code(201).send(saved))
      .catch((error) => fail(reply, error));
  });

  app.get<{ Querystring: { link?: string; from?: string } }>(
    "/notes/image",
    async (request, reply) =>
      notes
        .image(request.query.link ?? "", request.query.from)
        .then((image) =>
          reply
            .type(image.type)
            // An SVG opened on its own must not run scripts.
            .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
            .header("Cache-Control", "no-cache")
            .send(image.data),
        )
        .catch((error) => fail(reply, error)),
  );

  app.get("/notes/graph", async (_request, reply) => {
    try {
      return notes.graph();
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.get<PathQuery>("/notes/backlinks", async (request) =>
    backlinks(db, request.query.path ?? ""),
  );

  app.get("/notes/tags", async () => tagCounts(db));

  app.get<{ Querystring: { q?: string; tag?: string } }>("/notes/search", async (request) => {
    const tag = request.query.tag?.replace(/^#/, "");
    if (tag) return notesWithTag(db, normalizeTag(tag));
    return searchNotes(db, request.query.q ?? "");
  });
};
