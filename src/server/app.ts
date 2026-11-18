import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import type { AppDatabase } from "./db/client";
import { healthRoutes } from "./routes/health";

export interface BuildAppOptions {
  db: AppDatabase;
  /** Folder with the built client. When set, the server also serves the UI. */
  clientDir?: string;
  logger?: boolean;
}

export async function buildApp({ db, clientDir, logger = false }: BuildAppOptions) {
  const app = Fastify({ logger: logger && { level: "warn" } });

  // YouTube embeds need a Referer header; this policy sends only the origin to other sites.
  app.addHook("onSend", async (_request, reply) => {
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  });

  await app.register(healthRoutes, { prefix: "/api", db });

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
