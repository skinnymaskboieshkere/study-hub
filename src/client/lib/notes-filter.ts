import type { NoteListItemDto, NoteTreeNodeDto } from "@shared/api";
import { SUBJECTS, type Subject } from "@shared/catalog";

const clean = (value: string) => value.normalize("NFC").toLowerCase();

/** Letters of the query appear in this order (gaps allowed): "прдл" fits "пределы". */
function isSubsequence(query: string, text: string): boolean {
  let at = 0;
  for (const char of text) {
    if (char === query[at]) at += 1;
    if (at === query.length) return true;
  }
  return query.length === 0;
}

/**
 * Notes for the quick switcher (Ctrl+O): title start first, then title contains, then the
 * path, then loose letter matches; ties go to the most recently changed note.
 */
export function filterNotes(
  notes: readonly NoteListItemDto[],
  query: string,
  limit = 50,
): NoteListItemDto[] {
  const wanted = clean(query.trim());
  const scored = notes
    .map((note) => {
      const title = clean(note.title);
      const path = clean(note.path.replace(/\.md$/i, ""));
      const score = !wanted
        ? 1
        : title.startsWith(wanted)
          ? 4
          : title.includes(wanted)
            ? 3
            : path.includes(wanted)
              ? 2
              : isSubsequence(wanted.replace(/\s+/g, ""), title)
                ? 1
                : 0;
      return { note, score };
    })
    .filter((entry) => entry.score > 0);
  scored.sort((a, b) => b.score - a.score || b.note.mtimeMs - a.note.mtimeMs);
  return scored.slice(0, limit).map((entry) => entry.note);
}

/** Search snippet → pieces, `hit: true` for the found words (marked by the server). */
export function snippetParts(snippet: string): { text: string; hit: boolean }[] {
  const open = String.fromCharCode(2);
  const close = String.fromCharCode(3);
  const parts: { text: string; hit: boolean }[] = [];
  for (const chunk of snippet.split(open)) {
    const [hit, rest] = chunk.includes(close) ? chunk.split(close, 2) : [null, chunk];
    if (hit) parts.push({ text: hit, hit: true });
    if (rest) parts.push({ text: rest, hit: false });
  }
  return parts;
}

/** The file tree with only the notes of these subjects and the folders that lead to them. */
export function filterTreeBySubject(
  nodes: NoteTreeNodeDto[],
  subjects: readonly string[],
): NoteTreeNodeDto[] {
  if (subjects.length === 0) return nodes;
  const keep = (items: NoteTreeNodeDto[]): NoteTreeNodeDto[] =>
    items.flatMap((node) => {
      if (node.type === "note")
        return node.subject && subjects.includes(node.subject) ? [node] : [];
      const children = keep(node.children ?? []);
      return children.length > 0 ? [{ ...node, children }] : [];
    });
  return keep(nodes);
}

/** Subjects that some note in the tree has, in the catalog order: the filter offers only them. */
export function treeSubjects(nodes: NoteTreeNodeDto[]): Subject[] {
  const found = new Set<Subject>();
  const walk = (items: NoteTreeNodeDto[]) => {
    for (const node of items) {
      if (node.subject) found.add(node.subject);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return SUBJECTS.filter((subject) => found.has(subject));
}

/** Every folder path in the tree: a filtered tree opens them all. */
export function folderPaths(nodes: NoteTreeNodeDto[]): string[] {
  return nodes.flatMap((node) =>
    node.type === "folder" ? [node.path, ...folderPaths(node.children ?? [])] : [],
  );
}
