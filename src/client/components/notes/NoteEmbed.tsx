import { resolveLink, sectionOf } from "@shared/notes";
import { FileText } from "lucide-react";
import { useNoteFile } from "@/app/notes-queries";
import { vaultImageUrl } from "@/lib/note-assets";
import { MarkdownPreview, type MarkdownPreviewProps } from "./MarkdownPreview";

/** `![[picture.png|300]]`: the number after `|` is the width, as in Obsidian. */
export function EmbeddedImage({
  target,
  alias,
  from,
}: {
  target: string;
  alias?: string;
  from: string;
}) {
  const width = alias && /^\d+(x\d+)?$/.test(alias) ? Number(alias.split("x")[0]) : undefined;
  return (
    <img
      className="md-image"
      src={vaultImageUrl(target, from)}
      alt={alias && !width ? alias : target}
      width={width}
      loading="lazy"
    />
  );
}

interface NoteEmbedProps extends Omit<MarkdownPreviewProps, "text" | "path"> {
  target: string;
  heading: string | null;
  from: string;
}

/** Most embeds inside embeds: deeper ones become links (a note may embed itself). */
const MAX_DEPTH = 2;

/** `![[Note]]` / `![[Note#Heading]]`: the other note (or its section) shown inside this one. */
export function NoteEmbed({ target, heading, from, ...preview }: NoteEmbedProps) {
  const resolved = resolveLink(target, preview.paths, from);
  const depth = preview.depth ?? 0;
  const note = useNoteFile(resolved && depth < MAX_DEPTH ? resolved : null);

  if (!resolved) {
    return (
      <button
        type="button"
        className="md-wikilink md-wikilink-missing"
        onClick={() => preview.onCreateNote(target)}
      >
        ↪ {target}
      </button>
    );
  }
  const title = (
    <button
      type="button"
      className="md-embed-title"
      onClick={() => preview.onOpenNote(resolved, heading)}
      title="Открыть заметку"
    >
      <FileText aria-hidden className="size-3.5" />
      {resolved.replace(/\.md$/i, "").split("/").pop()}
      {heading && ` › ${heading}`}
    </button>
  );
  if (depth >= MAX_DEPTH) return title;

  return (
    <section className="md-embed" aria-label={`Встроенная заметка ${target}`}>
      {title}
      {note.data ? (
        <MarkdownPreview
          {...preview}
          depth={depth + 1}
          path={resolved}
          text={heading ? sectionOf(note.data.content, heading) : note.data.content}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          {note.isError ? "Заметку не открыть" : "Загружаю…"}
        </p>
      )}
    </section>
  );
}
