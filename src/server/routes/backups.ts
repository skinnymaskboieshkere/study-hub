import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BackupError, createBackup, listBackups, restoreBackup } from "../backup/backup-service";
import { syncSeed } from "../catalog/seed";
import type { AppDatabase } from "../db/client";
import type { NotesService } from "../notes/notes-service";
import { readSettings, writeSettings } from "../settings/settings-service";

export interface BackupRouteOptions {
  db: AppDatabase;
  notes: NotesService;
  backupsDir: string;
  migrationsDir: string;
  seedDir: string;
}

const RestoreSchema = z.object({ name: z.string().min(1).max(200) });

/** Backups (SPEC §6.8): make one, list them, restore one. One operation at a time. */
export const backupRoutes: FastifyPluginAsync<BackupRouteOptions> = async (app, options) => {
  const { db, notes, backupsDir } = options;
  let busy = false;

  async function exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (busy) throw new BackupError("Уже идёт бэкап или восстановление — подожди", 409);
    busy = true;
    try {
      return await work();
    } finally {
      busy = false;
    }
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof BackupError)
      return reply.code(error.status).send({ error: error.message });
    return reply.send(error);
  });

  app.get("/backups", async () => listBackups(backupsDir));

  app.post("/backups", async () =>
    exclusive(() => createBackup({ db, backupsDir, vaultRoot: notes.vault?.root ?? null })),
  );

  app.post("/backups/restore", async (request, reply) => {
    const body = RestoreSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Не указан бэкап" });
    return exclusive(async () => {
      // The vault folder in use stays as it is: a restore never switches or overwrites it.
      const vaultPath = readSettings(db).vaultPath;
      const vaultRoot = notes.vault?.root ?? null;
      const result = await restoreBackup({
        db,
        backupsDir,
        vaultRoot,
        migrationsDir: options.migrationsDir,
        name: body.data.name,
      });
      writeSettings(db, { vaultPath });
      syncSeed(db, options.seedDir);
      await notes.connect(vaultRoot ?? undefined);
      return result;
    });
  });
};
