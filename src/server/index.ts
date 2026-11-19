import path from "node:path";
import { buildApp } from "./app";
import { syncSeed } from "./catalog/seed";
import { config } from "./config";
import { openDatabase } from "./db/client";
import { NotesService } from "./notes/notes-service";
import { readSettings } from "./settings/settings-service";
import { createYouTubeClient } from "./youtube/client";

const { db, close } = openDatabase({
  file: path.join(config.dataDir, "study.db"),
  migrationsDir: config.migrationsDir,
});

const seed = syncSeed(db, config.seedDir);
if (seed.applied) console.log(`Каталог обновлён: ${seed.courses} курсов`);

// Notes: the index catches up with the vault, then follows its changes (SPEC §5).
// A folder chosen in the settings wins over VAULT_PATH from .env.
const vaultPath = readSettings(db).vaultPath ?? config.vaultPath;
const notes = new NotesService(db, vaultPath);
if (notes.status().available) {
  const synced = await notes.sync();
  if (synced.indexed || synced.removed) {
    console.log(`Заметки: проиндексировано ${synced.indexed}, убрано из индекса ${synced.removed}`);
  }
  notes.watch();
} else if (vaultPath) {
  console.warn("Папка хранилища не найдена — заметки недоступны");
}

const app = await buildApp({
  notes,
  db,
  envVaultPath: config.vaultPath,
  youtube: config.youtubeApiKey ? createYouTubeClient(config.youtubeApiKey) : undefined,
  clientDir: config.isDev ? undefined : config.clientDir,
  logger: true,
});

await app.listen({ host: config.host, port: config.port });

if (config.isDev) {
  console.log(`API: http://${config.host}:${config.port}/api/health`);
} else {
  console.log(`Study Hub: http://${config.host}:${config.port}`);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app
      .close()
      .then(() => notes.close())
      .then(close)
      .finally(() => process.exit(0));
  });
}
