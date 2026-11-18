import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { EditorView } from "@codemirror/view";
import type { NoteListItemDto } from "@shared/api";

/** What the editor can suggest; read lazily, so the lists stay fresh without new extensions. */
export interface CompletionData {
  notes: () => readonly NoteListItemDto[];
  tags: () => readonly string[];
  /** Headings of the note a link points to (for `[[Note#…`). */
  headings: (target: string) => Promise<string[]>;
}

const folderOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/**
 * Inserts the text and puts the cursor after the closing `]]`. Typing `[[` already added `]]`
 * (bracket closing), so they are added only when missing.
 */
function insertLink(text: string) {
  return (view: EditorView, _completion: Completion, from: number, to: number) => {
    const closed = view.state.sliceDoc(to, to + 2) === "]]";
    const insert = closed ? text : `${text}]]`;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length + (closed ? 2 : 0) },
      userEvent: "input.complete",
    });
  };
}

/** Note names for `[[`. Two notes with one name get their folder, like in Obsidian. */
export function noteOptions(notes: readonly NoteListItemDto[]): Completion[] {
  const count = new Map<string, number>();
  for (const note of notes) {
    const key = note.title.toLowerCase();
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  return notes.map((note) => {
    const ambiguous = (count.get(note.title.toLowerCase()) ?? 0) > 1;
    const text = ambiguous ? note.path.replace(/\.md$/i, "") : note.title;
    return {
      label: text,
      detail: folderOf(note.path) || undefined,
      type: "text",
      apply: insertLink(text),
    };
  });
}

export function wikilinkCompletion(data: CompletionData) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const before = context.matchBefore(/\[\[[^[\]\n]*$/);
    if (!before) return null;
    const inner = before.text.slice(2);
    if (inner.includes("|")) return null;

    const hash = inner.indexOf("#");
    if (hash >= 0) {
      const headings = await data.headings(inner.slice(0, hash));
      return {
        from: before.from + 2 + hash + 1,
        options: headings.map((heading) => ({
          label: heading,
          type: "keyword",
          apply: insertLink(heading),
        })),
        validFor: /^[^[\]|#\n]*$/,
      };
    }
    return {
      from: before.from + 2,
      options: noteOptions(data.notes()),
      validFor: /^[^[\]|#\n]*$/,
    };
  };
}

export function tagCompletion(data: CompletionData) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/(?:^|[\s(])#[\p{L}\p{N}_/-]*$/u);
    if (!before) return null;
    const hash = before.text.indexOf("#");
    if (hash < 0) return null;
    // A lone "#" at the line start is a heading, not a tag.
    const from = before.from + hash + 1;
    if (from === context.pos && context.state.doc.lineAt(context.pos).from === from - 1)
      return null;
    return {
      from,
      options: data.tags().map((tag) => ({ label: tag, type: "constant" })),
      validFor: /^[\p{L}\p{N}_/-]*$/u,
    };
  };
}
