import { clock } from "@shared/note-templates";
import { NotebookPen } from "lucide-react";
import { Link } from "react-router";
import { useNotesStatus, useVideoNotes } from "@/app/notes-queries";

interface VideoNotesListProps {
  youtubeId: string;
  onSeek: (seconds: number) => void;
}

/** Every note about this lecture with its timecodes (SPEC §6.6). */
export function VideoNotesList({ youtubeId, onSeek }: VideoNotesListProps) {
  const status = useNotesStatus();
  const notes = useVideoNotes(youtubeId, Boolean(status.data?.available));

  if (!status.data?.available) {
    return <p className="text-sm text-ink-muted">Хранилище заметок не подключено.</p>;
  }
  if (!notes.data || notes.data.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        {notes.isPending
          ? "Ищу заметки…"
          : "Заметок к этой лекции пока нет. «Конспект» под видео создаст её."}
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {notes.data.map((note) => (
        <li key={note.path}>
          <Link
            to={`/notes?path=${encodeURIComponent(note.path)}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-lilac hover:underline"
          >
            {note.lecture && <NotebookPen aria-label="Конспект лекции" className="size-3.5" />}
            {note.title}
          </Link>
          {note.mentions.filter((mention) => mention.tSec > 0).length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {note.mentions
                .filter((mention) => mention.tSec > 0)
                .map((mention) => (
                  <li key={`${mention.line}:${mention.tSec}`}>
                    <button
                      type="button"
                      onClick={() => onSeek(mention.tSec)}
                      className="flex w-full items-start gap-2 rounded-md bg-surface-2 px-2 py-1.5 text-left text-xs text-ink-muted hover:text-ink"
                    >
                      <span className="shrink-0 font-mono text-lilac">▶ {clock(mention.tSec)}</span>
                      <span className="line-clamp-2">
                        {mention.context
                          .replace(/\[▶[^\]]*\]\([^)]*\)/g, "")
                          .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[.\]\s+)?/, "")
                          .trim() || "Таймкод"}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
