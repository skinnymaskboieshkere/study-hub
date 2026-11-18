import type { NoteListItemDto } from "@shared/api";

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
