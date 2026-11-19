import type { BacklinkDto, NoteSearchResultDto, TagCountDto, VideoNoteDto } from "@shared/api";
import { frontmatterTags, linkKey, noteName, parseNote, resolveLink } from "@shared/notes";
import { and, eq, inArray, sql } from "drizzle-orm";
import { parse as parseYaml } from "yaml";
import type { AppDatabase } from "../db/client";
import { noteLinks, notes, noteTags } from "../db/schema";
import { hashText } from "./vault";

/** Frontmatter as a plain object; broken YAML is kept out of the index, not fixed. */
export function readFrontmatter(raw: string | null): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const value: unknown = parseYaml(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Puts one note into the index (or refreshes it). Returns false when nothing changed. */
export function indexNote(
  db: AppDatabase,
  path: string,
  content: string,
  file: { mtimeMs: number; size: number },
): boolean {
  const hash = hashText(content);
  const known = db.select({ hash: notes.hash }).from(notes).where(eq(notes.path, path)).get();
  if (known?.hash === hash) {
    db.update(notes)
      .set({ mtimeMs: file.mtimeMs, size: file.size })
      .where(eq(notes.path, path))
      .run();
    return false;
  }

  const parsed = parseNote(content);
  const frontmatter = readFrontmatter(parsed.frontmatter);
  const tags = new Set([...parsed.tags, ...frontmatterTags(frontmatter?.tags ?? frontmatter?.tag)]);
  const title = noteName(path);

  db.transaction((tx) => {
    const values = { title, mtimeMs: file.mtimeMs, size: file.size, hash, frontmatter };
    tx.insert(notes)
      .values({ path, ...values })
      .onConflictDoUpdate({ target: notes.path, set: values })
      .run();
    tx.delete(noteLinks).where(eq(noteLinks.srcPath, path)).run();
    tx.delete(noteTags).where(eq(noteTags.path, path)).run();
    for (const link of parsed.links) {
      if (!link.target) continue;
      tx.insert(noteLinks)
        .values({
          srcPath: path,
          rawTarget: link.target,
          targetKey: linkKey(link.target),
          heading: link.heading,
          kind: link.embed ? "embed" : "wikilink",
          line: link.line,
          context: link.context,
        })
        .run();
    }
    for (const link of parsed.videoLinks) {
      tx.insert(noteLinks)
        .values({
          srcPath: path,
          rawTarget: link.videoId,
          targetKey: `video:${link.videoId}`,
          heading: null,
          kind: "video",
          line: link.line,
          context: link.context,
          videoId: link.videoId,
          tSec: link.tSec,
        })
        .run();
    }
    for (const tag of tags) tx.insert(noteTags).values({ path, tag }).run();
    tx.run(sql`DELETE FROM notes_fts WHERE path = ${path}`);
    tx.run(
      sql`INSERT INTO notes_fts (path, title, body) VALUES (${path}, ${title}, ${parsed.body})`,
    );
  });
  return true;
}

export function removeNote(db: AppDatabase, path: string): boolean {
  const removed = db.delete(notes).where(eq(notes.path, path)).run().changes > 0;
  db.run(sql`DELETE FROM notes_fts WHERE path = ${path}`);
  return removed;
}

/** Forgets the whole index: another vault was connected (links and tags go by cascade). */
export function clearIndex(db: AppDatabase) {
  db.delete(notes).run();
  db.run(sql`DELETE FROM notes_fts`);
}

/** What the index knows about each file: lets the start-up sync skip unchanged notes. */
export function indexedFiles(db: AppDatabase): Map<string, { mtimeMs: number; size: number }> {
  const rows = db
    .select({ path: notes.path, mtimeMs: notes.mtimeMs, size: notes.size })
    .from(notes)
    .all();
  return new Map(rows.map((row) => [row.path, row]));
}

export function notePaths(db: AppDatabase): string[] {
  return db
    .select({ path: notes.path })
    .from(notes)
    .all()
    .map((row) => row.path);
}

export function listNotes(db: AppDatabase) {
  return db
    .select({ path: notes.path, title: notes.title, mtimeMs: notes.mtimeMs })
    .from(notes)
    .orderBy(notes.title)
    .all();
}

/** Notes that link here, each with the lines that mention it (SPEC §6.5). */
export function backlinks(db: AppDatabase, path: string): BacklinkDto[] {
  const paths = notePaths(db);
  const candidates = db
    .select({
      srcPath: noteLinks.srcPath,
      rawTarget: noteLinks.rawTarget,
      line: noteLinks.line,
      context: noteLinks.context,
    })
    .from(noteLinks)
    .where(eq(noteLinks.targetKey, linkKey(path)))
    .orderBy(noteLinks.srcPath, noteLinks.line)
    .all()
    .filter((link) => link.srcPath !== path)
    .filter((link) => resolveLink(link.rawTarget, paths, link.srcPath) === path);

  const grouped = new Map<string, BacklinkDto>();
  for (const link of candidates) {
    const entry = grouped.get(link.srcPath) ?? {
      path: link.srcPath,
      title: noteName(link.srcPath),
      mentions: [],
    };
    if (!entry.mentions.some((mention) => mention.line === link.line)) {
      entry.mentions.push({ line: link.line, context: link.context });
    }
    grouped.set(link.srcPath, entry);
  }
  return [...grouped.values()];
}

export function tagCounts(db: AppDatabase): TagCountDto[] {
  return db
    .select({ tag: noteTags.tag, count: sql<number>`count(*)` })
    .from(noteTags)
    .groupBy(noteTags.tag)
    .orderBy(noteTags.tag)
    .all()
    .map((row) => ({ tag: row.tag, count: Number(row.count) }));
}

/** Notes with the tag or one nested under it (#матанализ finds #матанализ/пределы). */
export function notesWithTag(db: AppDatabase, tag: string): NoteSearchResultDto[] {
  const rows = db
    .selectDistinct({ path: noteTags.path })
    .from(noteTags)
    .where(sql`${noteTags.tag} = ${tag} OR ${noteTags.tag} LIKE ${`${tag}/%`}`)
    .all();
  if (rows.length === 0) return [];
  return db
    .select({ path: notes.path, title: notes.title })
    .from(notes)
    .where(
      inArray(
        notes.path,
        rows.map((row) => row.path),
      ),
    )
    .orderBy(notes.title)
    .all()
    .map((row) => ({ ...row, snippet: "" }));
}

/** Every word as a quoted prefix: safe for FTS5 and finds "производн" in "производная". */
export function ftsQuery(text: string): string | null {
  const words = text
    .normalize("NFC")
    .split(/[\s"]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter(Boolean)
    .slice(0, 8);
  return words.length ? words.map((word) => `"${word}"*`).join(" ") : null;
}

/** Full-text search; the snippet marks hits with \u0002 … \u0003 for the client to highlight. */
export function searchNotes(db: AppDatabase, text: string, limit = 30): NoteSearchResultDto[] {
  const query = ftsQuery(text);
  if (!query) return [];
  return db
    .all<{ path: string; title: string; snippet: string }>(
      sql`SELECT path, title, snippet(notes_fts, 2, char(2), char(3), '…', 14) AS snippet
          FROM notes_fts WHERE notes_fts MATCH ${query}
          ORDER BY bm25(notes_fts, 0, 6, 1) LIMIT ${limit}`,
    )
    .map((row) => ({ path: row.path, title: row.title, snippet: row.snippet }));
}

/** The lecture note of a video: its frontmatter says `video: <id>` (SPEC §6.6). */
export function lectureNoteFor(db: AppDatabase, videoId: string): string | null {
  const row = db
    .select({ path: notes.path })
    .from(notes)
    .where(sql`json_extract(${notes.frontmatter}, '$.video') = ${videoId}`)
    .orderBy(notes.path)
    .get();
  return row?.path ?? null;
}

/**
 * Notes about a video: its lecture note and every note with a link or timecode to it, with
 * the lines that mention it — "на странице лекции видны все заметки" (SPEC §6.6).
 */
export function videoNotes(db: AppDatabase, videoId: string): VideoNoteDto[] {
  const lecture = lectureNoteFor(db, videoId);
  const links = db
    .select({
      path: noteLinks.srcPath,
      line: noteLinks.line,
      context: noteLinks.context,
      tSec: noteLinks.tSec,
    })
    .from(noteLinks)
    .where(and(eq(noteLinks.kind, "video"), eq(noteLinks.videoId, videoId)))
    .orderBy(noteLinks.srcPath, noteLinks.line)
    .all();

  const grouped = new Map<string, VideoNoteDto>();
  if (lecture) {
    grouped.set(lecture, { path: lecture, title: noteName(lecture), lecture: true, mentions: [] });
  }
  for (const link of links) {
    const entry = grouped.get(link.path) ?? {
      path: link.path,
      title: noteName(link.path),
      lecture: false,
      mentions: [],
    };
    entry.mentions.push({ line: link.line, context: link.context, tSec: link.tSec ?? 0 });
    grouped.set(link.path, entry);
  }
  return [...grouped.values()];
}

/** Videos that have a lecture note or a link in some note: the course page marks them. */
export function notedVideoIds(db: AppDatabase): string[] {
  const linked = db
    .selectDistinct({ id: noteLinks.videoId })
    .from(noteLinks)
    .where(eq(noteLinks.kind, "video"))
    .all()
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
  const lectures = db
    .all<{ id: string | null }>(
      sql`SELECT DISTINCT json_extract(frontmatter_json, '$.video') AS id FROM notes
          WHERE json_extract(frontmatter_json, '$.video') IS NOT NULL`,
    )
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
  return [...new Set([...linked, ...lectures])];
}
