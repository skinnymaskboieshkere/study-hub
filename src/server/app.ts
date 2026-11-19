import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { config } from "./config";
import type { AppDatabase } from "./db/client";
import { backupRoutes } from "./routes/backups";
import { catalogRoutes } from "./routes/catalog";
import { NotesService } from "./notes/notes-service";
import { healthRoutes } from "./routes/health";
import { notesRoutes } from "./routes/notes";
import { planRoutes } from "./routes/plan";
import { progressRoutes } from "./routes/progress";
import { roadmapRoutes } from "./routes/roadmap";
import { settingsRoutes } from "./routes/settings";
import { statsRoutes } from "./routes/stats";
import { taskRoutes } from "./routes/tasks";
import type { YouTubeClient } from "./youtube/client";

export interface BuildAppOptions {
  db: AppDatabase;
  /** YouTube Data API client; without it the in-app import is unavailable. */
  youtube?: YouTubeClient;
  /** Folder with the built client. When set, the server also serves the UI. */
  clientDir?: string;
  /** Notes in the vault; without it the notes API says that no vault is connected. */
  notes?: NotesService;
  /** VAULT_PATH from .env, the vault used while the settings name none. */
  envVaultPath?: string;
  /** Database folder and backups folder (settings, backups). */
  dataDir?: string;
  backupsDir?: string;
  migrationsDir?: string;
  seedDir?: string;
  logger?: boolean;
}

export async function buildApp({
  db,
  youtube,
  clientDir,
  notes,
  envVaultPath,
  dataDir = config.dataDir,
  backupsDir = config.backupsDir,
  migrationsDir = config.migrationsDir,
  seedDir = config.seedDir,
  logger = false,
}: BuildAppOptions) {
  const app = Fastify({ logger: logger && { level: "warn" } });

  // YouTube embeds need a Referer header; this policy sends only the origin to other sites.
  app.addHook("onSend", async (_request, reply) => {
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  });

  await app.register(healthRoutes, { prefix: "/api", db });
  await app.register(catalogRoutes, { prefix: "/api", db, youtube });
  await app.register(progressRoutes, { prefix: "/api", db });
  await app.register(planRoutes, { prefix: "/api", db });
  await app.register(taskRoutes, { prefix: "/api", db });
  await app.register(roadmapRoutes, { prefix: "/api", db });
  const notesService = notes ?? new NotesService(db, undefined);
  await app.register(notesRoutes, { prefix: "/api", db, notes: notesService });
  await app.register(statsRoutes, { prefix: "/api", db, notes: notesService });
  await app.register(settingsRoutes, {
    prefix: "/api",
    db,
    notes: notesService,
    envVaultPath,
    dataDir,
    backupsDir,
  });
  await app.register(backupRoutes, {
    prefix: "/api",
    db,
    notes: notesService,
    backupsDir,
    migrationsDir,
    seedDir,
  });

  if (clientDir) {
    await app.register(fastifyStatic, { root: path.resolve(clientDir) });
    // Unknown pages get index.html so React Router can show them.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
