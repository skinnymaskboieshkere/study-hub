import type { NoteListItemDto, TagCountDto } from "@shared/api";
import { parseNote, resolveLink } from "@shared/notes";
import { useMemo } from "react";
import { fetchNote } from "@/app/notes-queries";
import type { CompletionData } from "@/lib/editor/completion";

/**
 * What the editor suggests: note names after `[[`, their headings after `#`, vault tags after
 * `#`. Headings of the open note come from its current text, others from the server.
 */
export function useNoteCompletion(input: {
  notes: readonly NoteListItemDto[];
  tags: readonly TagCountDto[] | undefined;
  paths: readonly string[];
  path: string | null;
  text: string;
}): CompletionData {
  const { notes, tags, paths, path, text } = input;
  return useMemo<CompletionData>(
    () => ({
      notes: () => notes,
      tags: () => (tags ?? []).map((tag) => tag.tag),
      headings: async (target) => {
        const resolved = target ? resolveLink(target, paths, path ?? undefined) : path;
        if (!resolved) return [];
        const note = resolved === path ? null : await fetchNote(resolved).catch(() => null);
        return parseNote(note ? note.content : text).headings.map((heading) => heading.text);
      },
    }),
    [notes, tags, paths, path, text],
  );
}
