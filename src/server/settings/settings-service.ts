import { statSync } from "node:fs";
import path from "node:path";
import { AppSettingsSchema, type AppSettings, type SettingsPatch } from "@shared/settings";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { settings } from "../db/schema";

const KEY = "app";

export function readSettings(db: AppDatabase): AppSettings {
  const row = db.select().from(settings).where(eq(settings.key, KEY)).get();
  let stored: unknown = {};
  try {
    stored = row ? JSON.parse(row.valueJson) : {};
  } catch {
    // A broken value falls back to the defaults.
  }
  const parsed = AppSettingsSchema.safeParse(stored);
  return parsed.success ? parsed.data : AppSettingsSchema.parse({});
}

export function writeSettings(db: AppDatabase, patch: SettingsPatch): AppSettings {
  const next = AppSettingsSchema.parse({ ...readSettings(db), ...patch });
  const valueJson = JSON.stringify(next);
  db.insert(settings)
    .values({ key: KEY, valueJson })
    .onConflictDoUpdate({ target: settings.key, set: { valueJson } })
    .run();
  return next;
}

export class SettingsError extends Error {}

/** A vault folder from the settings must be an existing folder given by its full path. */
export function checkVaultFolder(folder: string): string {
  if (!path.isAbsolute(folder)) throw new SettingsError("Укажи полный путь, например D:\\Notes");
  const isFolder = (() => {
    try {
      return statSync(folder).isDirectory();
    } catch {
      return false;
    }
  })();
  if (!isFolder) throw new SettingsError("Такой папки нет");
  return path.resolve(folder);
}
