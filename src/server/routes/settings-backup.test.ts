import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CourseDetailDto, StatsDto } from "@shared/api";
import type { SettingsDto } from "@shared/settings";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import type { BackupDto } from "../backup/backup-service";
import { applySeed } from "../catalog/seed";
import { openDatabase } from "../db/client";
import { studySessions } from "../db/schema";
import { NotesService } from "../notes/notes-service";

const video = (index: number) => `calc${index}`.padEnd(11, "0");

const seed = {
  hash: "backup-test",
  tracks: {
    tracks: [
      { slug: "foundation", title: "Фундамент", color: "#a78bfa", order: 1, description: "-" },
    ],
    courses: [{ course: "calc", track: "foundation", order: 1, prerequisites: [] }],
  },
  courses: [
    {
      slug: "calc",
      title: "Calculus",
      shortTitle: "18.01",
      university: "MIT",
      instructors: ["Someone"],
      subject: "math",
      level: 1,
      description: "-",
      sourceUrl: "https://ocw.mit.edu/",
      license: "CC BY-NC-SA 4.0",
      verifiedAt: "2026-11-19",
      status: "imported",
      youtubePlaylistIds: [],
      materials: [],
      skills: [],
      units: [
        {
          title: "Unit",
          videos: [0, 1, 2, 3].map((index) => ({
            youtubeId: video(index),
            title: `Lecture ${index + 1}`,
            durationSec: 3600,
            kind: "lecture",
            language: "en",
            embeddable: true,
          })),
        },
      ],
    },
  ],
} as unknown as Parameters<typeof applySeed>[1];

describe("settings, backups and stats API", () => {
  let root: string;
  let vault: string;
  let backups: string;
  let database: ReturnType<typeof openDatabase>;
  let notes: NotesService;
  let app: Awaited<ReturnType<typeof buildApp>>;

  const complete = (index: number) =>
    app.inject({
      method: "POST",
      url: `/api/progress/${video(index)}/complete`,
      payload: { completed: true },
    });
  const progress = async () =>
    (await app.inject({ method: "GET", url: "/api/courses/calc" })).json<CourseDetailDto>()
      .progress;

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), "study-hub-backup-"));
    vault = path.join(root, "vault");
    backups = path.join(root, "backups");
    mkdirSync(vault);
    mkdirSync(path.join(root, "other"));
    writeFileSync(path.join(vault, "Пределы.md"), "# Пределы\n\nСм. [[Производная]]\n");
    writeFileSync(path.join(root, "other", "Другая.md"), "# Другая\n");
    // The catalog the restore re-syncs with: the same courses as the test seed.
    const seedDir = path.join(root, "seed");
    mkdirSync(path.join(seedDir, "courses"), { recursive: true });
    writeFileSync(path.join(seedDir, "tracks.json"), JSON.stringify(seed.tracks));
    for (const course of seed.courses)
      writeFileSync(path.join(seedDir, "courses", `${course.slug}.json`), JSON.stringify(course));

    database = openDatabase({ file: ":memory:", migrationsDir: path.resolve("drizzle") });
    applySeed(database.db, seed);
    notes = new NotesService(database.db, vault);
    await notes.sync();
    app = await buildApp({
      db: database.db,
      notes,
      envVaultPath: vault,
      dataDir: root,
      backupsDir: backups,
      seedDir: path.join(root, "seed"),
    });
  });

  afterEach(async () => {
    await app.close();
    await notes.close();
    database.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("keeps settings and checks the vault folder", async () => {
    const initial = (await app.inject({ method: "GET", url: "/api/settings" })).json<SettingsDto>();
    expect(initial.settings).toEqual({
      youtubeNoCookie: false,
      captions: true,
      pauseOnTimecode: false,
      timecodeHotkey: "alt-t",
      vaultPath: null,
    });
    expect(initial.vault).toMatchObject({ path: vault, envPath: vault, notes: 1 });

    const saved = await app.inject({
      method: "PUT",
      url: "/api/settings",
      payload: { captions: false, timecodeHotkey: "alt-k" },
    });
    expect(saved.json<SettingsDto>().settings).toMatchObject({
      captions: false,
      timecodeHotkey: "alt-k",
    });

    for (const vaultPath of ["relative/folder", path.join(root, "missing")]) {
      const bad = await app.inject({ method: "PUT", url: "/api/settings", payload: { vaultPath } });
      expect(bad.statusCode).toBe(400);
    }
    const unknown = await app.inject({ method: "PUT", url: "/api/settings", payload: { x: 1 } });
    expect(unknown.statusCode).toBe(400);
  });

  it("switches to another vault and back to the one from .env", async () => {
    const other = path.join(root, "other");
    const switched = await app.inject({
      method: "PUT",
      url: "/api/settings",
      payload: { vaultPath: other },
    });
    expect(switched.json<SettingsDto>().vault).toMatchObject({ path: other, notes: 1 });
    const list = (await app.inject({ method: "GET", url: "/api/notes/list" })).json<
      { path: string }[]
    >();
    expect(list.map((note) => note.path)).toEqual(["Другая.md"]);

    const back = await app.inject({
      method: "PUT",
      url: "/api/settings",
      payload: { vaultPath: null },
    });
    expect(back.json<SettingsDto>().vault.path).toBe(vault);
  });

  it("makes a backup and restores the database without touching the vault", async () => {
    await complete(0);
    await app.inject({ method: "PUT", url: "/api/settings", payload: { captions: false } });
    const made = await app.inject({ method: "POST", url: "/api/backups" });
    expect(made.statusCode).toBe(200);
    const backup = made.json<BackupDto & { files: number }>();
    expect(backup.files).toBe(1);
    expect(backup.name).toMatch(/^study-hub-\d{4}-\d{2}-\d{2}-\d{6}\.zip$/);

    // Later changes: more progress, other settings, an edited note.
    await complete(1);
    await complete(2);
    await app.inject({ method: "PUT", url: "/api/settings", payload: { captions: true } });
    writeFileSync(path.join(vault, "Пределы.md"), "# Пределы\n\nНовая версия\n");
    expect(await progress()).toBeCloseTo(0.75);

    // Right away: the safety backup takes the next free second instead of failing.
    const restored = await app.inject({
      method: "POST",
      url: "/api/backups/restore",
      payload: { name: backup.name },
    });
    expect(restored.statusCode).toBe(200);
    const result = restored.json<{ safetyBackup: string; vaultFolder: string }>();

    expect(await progress()).toBeCloseTo(0.25);
    const settings = (
      await app.inject({ method: "GET", url: "/api/settings" })
    ).json<SettingsDto>();
    expect(settings.settings.captions).toBe(false);
    // The live vault keeps the new text; the old one is in the unpacked folder.
    expect(readFileSync(path.join(vault, "Пределы.md"), "utf8")).toContain("Новая версия");
    expect(readFileSync(path.join(result.vaultFolder, "Пределы.md"), "utf8")).toContain(
      "[[Производная]]",
    );
    expect(existsSync(path.join(backups, result.safetyBackup))).toBe(true);
    // The notes index is rebuilt from the live vault.
    expect(settings.vault.notes).toBe(1);

    const list = (await app.inject({ method: "GET", url: "/api/backups" })).json<BackupDto[]>();
    expect(list.map((item) => item.name).sort()).toEqual([backup.name, result.safetyBackup].sort());
  });

  it("refuses unknown backups and names that point outside the folder", async () => {
    for (const name of ["study-hub-2026-01-01-000000.zip", "../study.db", "..\\x.zip"]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/backups/restore",
        payload: { name },
      });
      expect(response.statusCode).toBe(404);
    }
  });

  it("sums study time of a week by day, track and subject", async () => {
    database.db
      .insert(studySessions)
      .values([
        { date: "2026-11-16", courseSlug: "calc", seconds: 1800 },
        { date: "2026-11-18", courseSlug: "calc", seconds: 600 },
        { date: "2026-11-09", courseSlug: "calc", seconds: 900 },
      ])
      .run();
    const stats = (
      await app.inject({ method: "GET", url: "/api/stats?period=week&date=2026-11-19" })
    ).json<StatsDto>();
    expect(stats).toMatchObject({
      from: "2026-11-16",
      to: "2026-11-22",
      previous: "2026-11-09",
      total: 2400,
      activeDays: 2,
      bySubject: [{ subject: "math", seconds: 2400 }],
      notes: { count: 1, links: 1, timecodes: 0 },
    });
    expect(stats.days.map((day) => day.seconds)).toEqual([1800, 0, 600, 0, 0, 0, 0]);
    expect(stats.byTrack).toEqual([
      { slug: "foundation", title: "Фундамент", color: "#a78bfa", seconds: 2400 },
    ]);
    expect(stats.courses[0]).toMatchObject({ slug: "calc", seconds: 2400 });
    expect(stats.streak.best).toBe(1);

    const bad = await app.inject({ method: "GET", url: "/api/stats?period=year" });
    expect(bad.statusCode).toBe(400);
  });
});
