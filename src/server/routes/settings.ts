import { SettingsPatchSchema, type SettingsDto } from "@shared/settings";
import type { FastifyPluginAsync } from "fastify";
import type { AppDatabase } from "../db/client";
import type { NotesService } from "../notes/notes-service";
import {
  checkVaultFolder,
  readSettings,
  SettingsError,
  writeSettings,
} from "../settings/settings-service";

export interface SettingsRouteOptions {
  db: AppDatabase;
  notes: NotesService;
  /** VAULT_PATH from .env: used while the settings name no folder. */
  envVaultPath: string | undefined;
  dataDir: string;
  backupsDir: string;
}

/** Settings (SPEC §6.8). */
export const settingsRoutes: FastifyPluginAsync<SettingsRouteOptions> = async (app, options) => {
  const { db, notes } = options;

  const dto = (): SettingsDto => {
    const status = notes.status();
    return {
      settings: readSettings(db),
      vault: {
        path: notes.vault?.root ?? null,
        envPath: options.envVaultPath ?? null,
        available: status.available,
        notes: status.notes,
      },
      dataDir: options.dataDir,
      backupsDir: options.backupsDir,
    };
  };

  app.get("/settings", async () => dto());

  app.put("/settings", async (request, reply) => {
    const patch = SettingsPatchSchema.safeParse(request.body);
    if (!patch.success) return reply.code(400).send({ error: "Неверные настройки" });
    try {
      const vaultPath =
        typeof patch.data.vaultPath === "string"
          ? checkVaultFolder(patch.data.vaultPath)
          : patch.data.vaultPath;
      const before = readSettings(db).vaultPath;
      writeSettings(db, vaultPath === undefined ? patch.data : { ...patch.data, vaultPath });
      if (vaultPath !== undefined && vaultPath !== before) {
        await notes.connect(vaultPath ?? options.envVaultPath);
      }
    } catch (error) {
      if (error instanceof SettingsError) return reply.code(400).send({ error: error.message });
      throw error;
    }
    return dto();
  });
};
