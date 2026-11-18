import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { HealthResponseSchema } from "@shared/api";
import { buildApp } from "./app";
import { openDatabase } from "./db/client";

describe("GET /api/health", () => {
  const { db, close } = openDatabase({
    file: ":memory:",
    migrationsDir: path.resolve("drizzle"),
  });
  afterAll(close);

  it("returns ok and the referrer policy YouTube needs", async () => {
    const app = await buildApp({ db });
    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(HealthResponseSchema.parse(response.json())).toEqual({ status: "ok" });
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    await app.close();
  });

  it("answers unknown API routes with 404", async () => {
    const app = await buildApp({ db });
    const response = await app.inject({ method: "GET", url: "/api/nope" });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
