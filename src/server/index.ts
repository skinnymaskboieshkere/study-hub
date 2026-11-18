import path from "node:path";
import { buildApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db/client";

const { db, close } = openDatabase({
  file: path.join(config.dataDir, "study.db"),
  migrationsDir: config.migrationsDir,
});

const app = await buildApp({
  db,
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
