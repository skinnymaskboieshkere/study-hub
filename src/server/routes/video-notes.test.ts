import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LectureNoteDto, VideoNoteDto } from "@shared/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { applySeed } from "../catalog/seed";
import { openDatabase } from "../db/client";
import { NotesService } from "../notes/notes-service";

const FIRST = "cs50lectur0";
const SECOND = "cs50lectur1";

const seed = {
  hash: "video-notes-test",
  tracks: {
    tracks: [
      { slug: "foundation", title: "Фундамент", color: "#a78bfa", order: 1, description: "-" },
    ],
    courses: [{ course: "cs50x", track: "foundation", order: 0, prerequisites: [] }],
  },
  courses: [
    {
      slug: "cs50x",
      title: "CS50x: Introduction to Computer Science",
      shortTitle: "CS50x",
      university: "Harvard",
      instructors: ["David J. Malan"],
      subject: "programming",
      level: 1,
      description: "-",
      sourceUrl: "https://cs50.harvard.edu/x/",
      license: "CC BY-NC-SA 4.0",
      verifiedAt: "2026-11-18",
      status: "imported",
      youtubePlaylistIds: [],
      materials: [],
      skills: [],
      units: [
        {
          title: "Неделя 0",
          videos: [
            {
              youtubeId: FIRST,
              title: "Лекция 0: Scratch",
              durationSec: 3600,
              kind: "lecture",
              language: "en",
              embeddable: true,
            },
            {
              youtubeId: SECOND,
              title: "Лекция 1 — C",
              durationSec: 3600,
              kind: "lecture",
              language: "en",
              embeddable: true,
            },
          ],
        },
      ],
    },
  ],
} as unknown as Parameters<typeof applySeed>[1];

describe("video ↔ notes API", () => {
  let root: string;
  let database: ReturnType<typeof openDatabase>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const write = (relative: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content, "utf8");
  };
  const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
  const lecture = async (youtubeId: string) =>
    (
      await app.inject({
        method: "POST",
        url: "/api/notes/lecture",
        payload: { youtubeId, course: "cs50x" },
      })
    ).json<LectureNoteDto>();

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), "vault-"));
    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    applySeed(database.db, seed);
    const notes = new NotesService(database.db, root);
    await notes.sync();
    app = await buildApp({ db: database.db, notes });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("creates the lecture note once, with the SPEC path and frontmatter", async () => {
    const first = await lecture(FIRST);
    expect(first).toEqual({ path: "Courses/CS50x/01 - Лекция 0 Scratch.md", created: true });
    const text = read(first.path!);
    expect(text).toContain(`video: ${FIRST}`);
    expect(text).toContain("## Где пригодится (робототехника / CV)");

    expect(await lecture(FIRST)).toEqual({ path: first.path, created: false });
    const found = await app.inject({ method: "GET", url: `/api/notes/lecture?video=${FIRST}` });
    expect(found.json()).toEqual({ path: first.path, created: false });
  });

  it("uses Templates/Лекция.md and adds the video when the template has none", async () => {
    write(
      "Templates/Лекция.md",
      "---\ntags: [конспект]\n---\n# {{title}}\nКурс: {{courseTitle}}\n",
    );
    const note = await lecture(SECOND);
    expect(note.path).toBe("Courses/CS50x/02 - Лекция 1 — C.md");
    const text = read(note.path!);
    expect(text).toContain(`video: ${SECOND}`);
    expect(text).toContain("tags: [конспект]");
    expect(text).toContain("# Лекция 1 — C\nКурс: CS50x: Introduction to Computer Science");
    // Found again by its video, not doubled.
    expect((await lecture(SECOND)).created).toBe(false);
  });

  it("lists notes with timecodes to a video", async () => {
    const own = await lecture(FIRST);
    const response = await app.inject({
      method: "POST",
      url: "/api/notes",
      payload: { folder: "", name: "Идеи" },
    });
    const idea = response.json<{ path: string; hash: string }>();
    await app.inject({
      method: "PUT",
      url: "/api/notes/file",
      payload: {
        path: idea.path,
        content: `Цикл: [▶ 12:34](https://www.youtube.com/watch?v=${FIRST}&t=754s)`,
        baseHash: idea.hash,
      },
    });

    const notes = (
      await app.inject({ method: "GET", url: `/api/notes/video?video=${FIRST}` })
    ).json<VideoNoteDto[]>();
    expect(notes).toEqual([
      // The lecture note links its own video under the title.
      {
        path: own.path,
        title: "01 - Лекция 0 Scratch",
        lecture: true,
        mentions: [expect.objectContaining({ tSec: 0 })],
      },
      {
        path: "Идеи.md",
        title: "Идеи",
        lecture: false,
        mentions: [{ line: 0, context: expect.stringContaining("12:34"), tSec: 754 }],
      },
    ]);
    const noted = (await app.inject({ method: "GET", url: "/api/notes/noted-videos" })).json();
    expect(noted).toEqual([FIRST]);
  });

  it("creates the daily note once", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/notes/daily",
      payload: { date: "2026-11-18" },
    });
    expect(response.json()).toEqual({ path: "Daily/2026-11-18.md", created: true });
    const text = read("Daily/2026-11-18.md");
    expect(text).toContain("# Среда, 18 ноября 2026");
    expect(text).toContain("## План на день");
    const again = await app.inject({
      method: "POST",
      url: "/api/notes/daily",
      payload: { date: "2026-11-18" },
    });
    expect(again.json()).toEqual({ path: "Daily/2026-11-18.md", created: false });
  });

  it("lists templates", async () => {
    write("Templates/Лекция.md", "# {{title}}");
    write("Templates/Дневная заметка.md", "# {{title}}");
    const notes = new NotesService(database.db, root);
    await notes.sync();
    const list = (await app.inject({ method: "GET", url: "/api/notes/templates" })).json();
    expect(list).toEqual([
      { path: "Templates/Дневная заметка.md", name: "Дневная заметка" },
      { path: "Templates/Лекция.md", name: "Лекция" },
    ]);
  });
});
