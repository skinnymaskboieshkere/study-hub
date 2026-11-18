import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  BacklinkDto,
  NoteFileDto,
  NoteSavedDto,
  NoteSearchResultDto,
  NotesStatusDto,
  NoteTreeNodeDto,
  TagCountDto,
} from "@shared/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { openDatabase } from "../db/client";
import { NotesService } from "../notes/notes-service";

describe("notes API", () => {
  let root: string;
  let database: ReturnType<typeof openDatabase>;
  let notes: NotesService;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const write = (relative: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content, "utf8");
  };
  const get = async <T>(url: string) => (await app.inject({ method: "GET", url })).json<T>();
  const file = (notePath: string) =>
    get<NoteFileDto>(`/api/notes/file?path=${encodeURIComponent(notePath)}`);

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), "vault-"));
    write(
      "Матанализ/Производная.md",
      "---\ntags: [матанализ]\n---\n# Производная\nПредел отношения.",
    );
    write("Матанализ/Пределы.md", "Нужны для [[производная|производной]]. #матанализ/пределы");
    write(".obsidian/app.json", "{}");
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    notes = new NotesService(database.db, root);
    await notes.sync();
    app = await buildApp({ db: database.db, notes });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("says when no vault is connected", async () => {
    const bare = await buildApp({ db: database.db });
    const status = (await bare.inject({ method: "GET", url: "/api/notes/status" })).json();
    expect(status).toMatchObject({ configured: false, available: false });
    expect((await bare.inject({ method: "GET", url: "/api/notes/tree" })).statusCode).toBe(503);
    await bare.close();
  });

  it("shows the tree without hidden folders and the index status", async () => {
    const status = await get<NotesStatusDto>("/api/notes/status");
    expect(status).toMatchObject({ configured: true, available: true, notes: 2 });
    const tree = await get<NoteTreeNodeDto[]>("/api/notes/tree");
    expect(tree.map((node) => node.name)).toEqual(["Матанализ"]);
    expect(tree[0]?.children?.map((node) => node.name)).toEqual(["Пределы", "Производная"]);
  });

  it("reads a note with its frontmatter", async () => {
    const note = await file("Матанализ/Производная.md");
    expect(note.title).toBe("Производная");
    expect(note.frontmatter).toEqual({ tags: ["матанализ"] });
    expect(note.content).toContain("Предел отношения");
  });

  it("finds backlinks with context, case-insensitively", async () => {
    const links = await get<BacklinkDto[]>(
      `/api/notes/backlinks?path=${encodeURIComponent("Матанализ/Производная.md")}`,
    );
    expect(links).toEqual([
      {
        path: "Матанализ/Пределы.md",
        title: "Пределы",
        mentions: [
          { line: 0, context: "Нужны для [[производная|производной]]. #матанализ/пределы" },
        ],
      },
    ]);
  });

  it("saves a note and updates links and tags at once", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/api/notes",
        payload: { folder: "", name: "Интеграл" },
      })
    ).json<NoteSavedDto>();
    expect(created.path).toBe("Интеграл.md");

    const saved = await app.inject({
      method: "PUT",
      url: "/api/notes/file",
      payload: {
        path: created.path,
        content: "Обратно к [[Производная]] #интеграл",
        baseHash: created.hash,
      },
    });
    expect(saved.statusCode).toBe(200);
    expect(readFileSync(path.join(root, "Интеграл.md"), "utf8")).toContain("[[Производная]]");

    const links = await get<BacklinkDto[]>(
      `/api/notes/backlinks?path=${encodeURIComponent("Матанализ/Производная.md")}`,
    );
    expect(links.map((link) => link.title)).toEqual(["Интеграл", "Пределы"]);
    const tags = await get<TagCountDto[]>("/api/notes/tags");
    expect(tags).toEqual([
      { tag: "интеграл", count: 1 },
      { tag: "матанализ", count: 1 },
      { tag: "матанализ/пределы", count: 1 },
    ]);
  });

  it("refuses to overwrite a note changed outside", async () => {
    const note = await file("Матанализ/Пределы.md");
    write("Матанализ/Пределы.md", "Изменено в Obsidian");
    const response = await app.inject({
      method: "PUT",
      url: "/api/notes/file",
      payload: { path: note.path, content: "Моя правка", baseHash: note.hash },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json<{ current: { content: string } }>().current.content).toBe(
      "Изменено в Obsidian",
    );
    expect(readFileSync(path.join(root, "Матанализ/Пределы.md"), "utf8")).toBe(
      "Изменено в Obsidian",
    );
  });

  it("searches words by prefix and notes by tag, nested tags included", async () => {
    const found = await get<NoteSearchResultDto[]>(
      `/api/notes/search?q=${encodeURIComponent("предел отнош")}`,
    );
    expect(found.map((note) => note.path)).toEqual(["Матанализ/Производная.md"]);
    expect(found[0]?.snippet).toContain("\u0002");

    const tagged = await get<NoteSearchResultDto[]>(
      `/api/notes/search?tag=${encodeURIComponent("#Матанализ")}`,
    );
    expect(tagged.map((note) => note.title)).toEqual(["Пределы", "Производная"]);
  });

  it("never leaves the vault", async () => {
    for (const bad of [
      "../secret.md",
      ".obsidian/app.json",
      "C:/Windows/win.ini",
      "Матанализ/../../x.md",
    ]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/notes/file?path=${encodeURIComponent(bad)}`,
      });
      expect(response.statusCode, bad).toBe(400);
    }
    const write = await app.inject({
      method: "PUT",
      url: "/api/notes/file",
      payload: { path: "../outside.md", content: "x", baseHash: null },
    });
    expect(write.statusCode).toBe(400);
  });

  it("moves a deleted note to .trash and forgets it", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/notes/file?path=${encodeURIComponent("Матанализ/Пределы.md")}`,
    });
    expect(response.json()).toEqual({ trashedTo: ".trash/Пределы.md" });
    expect(existsSync(path.join(root, ".trash/Пределы.md"))).toBe(true);
    expect((await get<NotesStatusDto>("/api/notes/status")).notes).toBe(1);
  });

  it("picks up files changed while the app was closed", async () => {
    write("Матанализ/Пределы.md", "Теперь без ссылок");
    write("Новая.md", "Свежая заметка про [[Производная]]");
    rmSync(path.join(root, "Матанализ/Производная.md"));
    // A different size makes the change visible even within the same millisecond.
    expect(await notes.sync()).toEqual({ indexed: 2, removed: 1 });
    // Sorted by title: «Новая» before «Пределы».
    expect((await get<{ path: string }[]>("/api/notes/list")).map((note) => note.path)).toEqual([
      "Новая.md",
      "Матанализ/Пределы.md",
    ]);
  });

  it("creates folders with checked names", async () => {
    const ok = await app.inject({
      method: "POST",
      url: "/api/notes/folders",
      payload: { name: "Физика" },
    });
    expect(ok.json()).toEqual({ path: "Физика" });
    const bad = await app.inject({
      method: "POST",
      url: "/api/notes/folders",
      payload: { name: "a:b" },
    });
    expect(bad.statusCode).toBe(400);
  });
});
