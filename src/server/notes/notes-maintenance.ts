import type { RenameResultDto } from "@shared/api";
import { buildGraph, rewriteLinks, type GraphData, type GraphSource } from "@shared/note-links";
import { linkKey, resolveLink } from "@shared/notes";
import { and, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { courses, noteLinks, notes, noteTags } from "../db/schema";
import { indexNote, notePaths, removeNote } from "./note-index";
import { type Vault, VaultError } from "./vault";

/** Pictures a note can embed with `![[...]]` and that the app serves back. */
export const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

export const imageExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const isImage = (name: string) => imageExtension(name) in IMAGE_TYPES;

/**
 * Renames or moves a note and points every link in the vault at the new name (SPEC §9.3):
 * rename the file first, then rewrite the notes that linked to it, then re-index them.
 */
export async function renameNote(
  db: AppDatabase,
  vault: Vault,
  from: string,
  rawTo: string,
): Promise<RenameResultDto> {
  const to = rawTo.normalize("NFC").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  const target = /\.md$/i.test(to) ? to : `${to}.md`;
  if (target === from) return { path: target, links: 0, files: 0 };

  const pathsBefore = notePaths(db);
  // Notes whose links may lead here: same last name part, any folder, links and embeds.
  const sources = new Set(
    db
      .select({ path: noteLinks.srcPath })
      .from(noteLinks)
      .where(
        and(eq(noteLinks.targetKey, linkKey(from)), inArray(noteLinks.kind, ["wikilink", "embed"])),
      )
      .all()
      .map((row) => row.path),
  );

  await vault.move(from, target);
  const pathsAfter = [...pathsBefore.filter((path) => path !== from), target];
  removeNote(db, from);
  const moved = await vault.read(target);
  indexNote(db, target, moved.content, moved);

  let links = 0;
  let files = 0;
  for (const sourceBefore of sources) {
    const current = sourceBefore === from ? target : sourceBefore;
    const file = await vault.read(current).catch(() => null);
    if (!file) continue;
    const result = rewriteLinks(file.content, {
      sourceBefore,
      oldPath: from,
      newPath: target,
      pathsBefore,
      pathsAfter,
    });
    if (result.count === 0) continue;
    const written = await vault.write(current, result.content);
    indexNote(db, current, result.content, written);
    links += result.count;
    files += 1;
  }
  return { path: target, links, files };
}

/** Obsidian's name for a pasted picture: "Pasted image 20261119143005.png". */
export function pastedImageName(contentType: string, now: Date): string {
  const extension =
    Object.entries(IMAGE_TYPES).find(([, type]) => type === contentType)?.[0] ?? "png";
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `Pasted image ${stamp}.${extension}`;
}

/** A picture pasted into a note goes to `attachments/` (SPEC §6.5). */
export async function saveAttachment(vault: Vault, data: Buffer, contentType: string) {
  if (!Object.values(IMAGE_TYPES).includes(contentType)) {
    throw new VaultError("Вставлять можно только картинки");
  }
  const path = await vault.writeNew("attachments", pastedImageName(contentType, new Date()), data);
  return { path, name: path.split("/").pop() ?? path };
}

/** `![[picture.png]]` → the file, found like Obsidian finds notes: by name, any folder. */
export async function findImage(vault: Vault, link: string, from?: string): Promise<string> {
  const images = await vault.files(isImage);
  const found = resolveLink(link, images, from);
  if (!found) throw new VaultError("Картинка не найдена", 404);
  return found;
}

/** Notes, their links and tags for the graph; lecture notes get the color of their track. */
export function graphData(db: AppDatabase): GraphData {
  const trackOf = new Map(
    db
      .select({ slug: courses.slug, track: courses.trackSlug })
      .from(courses)
      .all()
      .map((row) => [row.slug, row.track]),
  );
  const tags = new Map<string, string[]>();
  for (const row of db.select().from(noteTags).all()) {
    tags.set(row.path, [...(tags.get(row.path) ?? []), row.tag]);
  }
  const targets = new Map<string, string[]>();
  for (const row of db
    .select({ path: noteLinks.srcPath, target: noteLinks.rawTarget })
    .from(noteLinks)
    .where(inArray(noteLinks.kind, ["wikilink", "embed"]))
    .all()) {
    // Embedded pictures are files, not notes: they stay out of the graph.
    if (/\.[a-z0-9]{2,5}$/i.test(row.target) && !/\.md$/i.test(row.target)) continue;
    targets.set(row.path, [...(targets.get(row.path) ?? []), row.target]);
  }
  const sources: GraphSource[] = db
    .select({ path: notes.path, frontmatter: notes.frontmatter })
    .from(notes)
    .all()
    .map((row) => {
      const course = row.frontmatter?.course;
      return {
        path: row.path,
        targets: targets.get(row.path) ?? [],
        tags: tags.get(row.path) ?? [],
        track: typeof course === "string" ? (trackOf.get(course) ?? null) : null,
      };
    });
  return buildGraph(sources);
}
