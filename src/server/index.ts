import path from "node:path";
import { buildApp } from "./app";
import { syncSeed } from "./catalog/seed";
import { config } from "./config";
import { openDatabase } from "./db/client";
import { createYouTubeClient } from "./youtube/client";

const { db, close } = openDatabase({
  file: path.join(config.dataDir, "study.db"),
  migrationsDir: config.migrationsDir,
});

const seed = syncSeed(db, config.seedDir);
if (seed.applied) console.log(`Каталог обновлён: ${seed.courses} курсов`);

const app = await buildApp({
  db,
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
      .then(close)
      .finally(() => process.exit(0));
  });
}
