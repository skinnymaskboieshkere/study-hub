import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BacklinkDto, RenameResultDto, TrashItemDto } from "@shared/api";
import type { GraphData } from "@shared/note-links";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { openDatabase } from "../db/client";
import { NotesService } from "../notes/notes-service";

/** 1×1 transparent PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

describe("notes: rename, trash, pictures, graph", () => {
  let root: string;
  let database: ReturnType<typeof openDatabase>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const write = (relative: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content, "utf8");
  };
  const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
  const get = async <T>(url: string) => (await app.inject({ method: "GET", url })).json<T>();
  const rename = (from: string, to: string) =>
    app.inject({ method: "POST", url: "/api/notes/rename", payload: { from, to } });

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), "vault-"));
    write("Матанализ/Производная.md", "# Производная\nСм. [[Пределы]].");
    write("Матанализ/Пределы.md", "Нужны для [[Производная]] и [[производная#Правила|правил]].");
    write("Входящие.md", "![[Матанализ/Производная]] и `[[Производная]]` в коде");
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    const notes = new NotesService(database.db, root);
    await notes.sync();
    app = await buildApp({ db: database.db, notes });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("renames a note and rewrites every link to it (SPEC §6.5 acceptance)", async () => {
    const response = await rename("Матанализ/Производная.md", "Матанализ/Производная функции");
    expect(response.json<RenameResultDto>()).toEqual({
      path: "Матанализ/Производная функции.md",
      links: 3,
      files: 2,
    });
    expect(existsSync(path.join(root, "Матанализ/Производная.md"))).toBe(false);
    expect(read("Матанализ/Пределы.md")).toBe(
      "Нужны для [[Производная функции]] и [[Производная функции#Правила|правил]].",
    );
    // Embeds move too; inline code stays as written.
    expect(read("Входящие.md")).toBe("![[Производная функции]] и `[[Производная]]` в коде");

    const backlinks = await get<BacklinkDto[]>(
      `/api/notes/backlinks?path=${encodeURIComponent("Матанализ/Производная функции.md")}`,
    );
    expect(backlinks.map((link) => link.title).sort()).toEqual(["Входящие", "Пределы"]);
  });

  it("moves a note to another folder and refuses a taken name", async () => {
    const moved = await rename("Матанализ/Пределы.md", "Архив/Пределы.md");
    expect(moved.json<RenameResultDto>()).toMatchObject({ path: "Архив/Пределы.md", links: 0 });
    expect(read("Матанализ/Производная.md")).toContain("[[Пределы]]");

    const taken = await rename("Архив/Пределы.md", "Входящие.md");
    expect(taken.statusCode).toBe(409);
    const outside = await rename("Входящие.md", "../Входящие.md");
    expect(outside.statusCode).toBe(400);
  });

  it("restores a note from the trash and deletes it for good", async () => {
    await app.inject({
      method: "DELETE",
      url: `/api/notes/file?path=${encodeURIComponent("Входящие.md")}`,
    });
    expect((await get<TrashItemDto[]>("/api/notes/trash")).map((item) => item.name)).toEqual([
      "Входящие.md",
    ]);

    const restored = await app.inject({
      method: "POST",
      url: "/api/notes/trash/restore",
      payload: { name: "Входящие.md", folder: "Матанализ" },
    });
    expect(restored.json()).toEqual({ path: "Матанализ/Входящие.md" });
    expect(existsSync(path.join(root, "Матанализ/Входящие.md"))).toBe(true);

    await app.inject({
      method: "DELETE",
      url: `/api/notes/file?path=${encodeURIComponent("Матанализ/Входящие.md")}`,
    });
    const purged = await app.inject({
      method: "DELETE",
      url: `/api/notes/trash?name=${encodeURIComponent("Входящие.md")}`,
    });
    expect(purged.statusCode).toBe(204);
    expect(await get<TrashItemDto[]>("/api/notes/trash")).toEqual([]);
    const sneaky = await app.inject({
      method: "DELETE",
      url: "/api/notes/trash?name=..%2F..%2Fx.md",
    });
    expect(sneaky.statusCode).toBe(400);
  });

  it("stores a pasted picture in attachments/ and serves it by name", async () => {
    const saved = await app.inject({
      method: "POST",
      url: "/api/notes/attachments",
      headers: { "content-type": "image/png" },
      payload: PNG,
    });
    expect(saved.statusCode).toBe(201);
    const { path: stored, name } = saved.json<{ path: string; name: string }>();
    expect(stored).toMatch(/^attachments\/Pasted image \d{14}\.png$/);

    const image = await app.inject({
      method: "GET",
      url: `/api/notes/image?link=${encodeURIComponent(name)}`,
    });
    expect(image.headers["content-type"]).toBe("image/png");
    expect(image.rawPayload.equals(PNG)).toBe(true);

    const text = await app.inject({
      method: "POST",
      url: "/api/notes/attachments",
      headers: { "content-type": "image/x-unknown" },
      payload: Buffer.from("nope"),
    });
    expect(text.statusCode).toBe(400);
  });

  it("builds the graph of notes and links", async () => {
    const graph = await get<GraphData>("/api/notes/graph");
    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "Входящие.md",
      "Матанализ/Пределы.md",
      "Матанализ/Производная.md",
    ]);
    expect(graph.links).toContainEqual({
      source: "Матанализ/Пределы.md",
      target: "Матанализ/Производная.md",
    });
    expect(graph.links).toContainEqual({
      source: "Входящие.md",
      target: "Матанализ/Производная.md",
    });
  });
});

describe("late saves", () => {
  it("do not bring a renamed note back under its old name", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "vault-"));
    writeFileSync(path.join(root, "Старое.md"), "текст", "utf8");
    const database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    const notes = new NotesService(database.db, root);
    await notes.sync();
    const app = await buildApp({ db: database.db, notes });
    const file = (
      await app.inject({
        method: "GET",
        url: `/api/notes/file?path=${encodeURIComponent("Старое.md")}`,
      })
    ).json<{ hash: string }>();
    await app.inject({
      method: "POST",
      url: "/api/notes/rename",
      payload: { from: "Старое.md", to: "Новое" },
    });

    const late = await app.inject({
      method: "PUT",
      url: "/api/notes/file",
      payload: { path: "Старое.md", content: "запоздалая правка", baseHash: file.hash },
    });
    expect(late.statusCode).toBe(409);
    expect(existsSync(path.join(root, "Старое.md"))).toBe(false);
    await app.close();
    database.close();
    rmSync(root, { recursive: true, force: true });
  });
});
