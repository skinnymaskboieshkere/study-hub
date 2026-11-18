import type { NoteListItemDto, NoteSearchResultDto } from "@shared/api";
import { FilePlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNoteSearch } from "@/app/notes-queries";
import { filterNotes, snippetParts } from "@/lib/notes-filter";
import { PickerDialog } from "./PickerDialog";

const folderOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

type SwitchItem = { kind: "note"; note: NoteListItemDto } | { kind: "create"; name: string };

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: readonly NoteListItemDto[];
  onOpen: (path: string) => void;
  onCreate: (name: string) => void;
}

/** Ctrl+O (SPEC §6.5): jump to a note by name; a new name creates the note. */
export function QuickSwitcher({ open, onOpenChange, notes, onOpen, onCreate }: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const items = useMemo<SwitchItem[]>(() => {
    const found: SwitchItem[] = filterNotes(notes, query).map((note) => ({ kind: "note", note }));
    const name = query.trim();
    const exists = notes.some((note) => note.title.toLowerCase() === name.toLowerCase());
    return name && !exists ? [...found, { kind: "create", name }] : found;
  }, [notes, query]);

  return (
    <PickerDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
      title="Быстрый переход"
      placeholder="Название заметки…"
      query={query}
      onQueryChange={setQuery}
      items={items}
      itemKey={(item) => (item.kind === "note" ? item.note.path : `create:${item.name}`)}
      renderItem={(item) =>
        item.kind === "note" ? (
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-ink">{item.note.title}</span>
            <span className="shrink-0 truncate text-xs text-ink-muted">
              {folderOf(item.note.path)}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-lilac">
            <FilePlus aria-hidden className="size-4" />
            Создать «{item.name}»
          </span>
        )
      }
      onPick={(item) => {
        onOpenChange(false);
        setQuery("");
        if (item.kind === "note") onOpen(item.note.path);
        else onCreate(item.name);
      }}
      empty="Заметок пока нет — набери название, чтобы создать."
    />
  );
}

interface NoteSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: string;
  onTagChange: (tag: string) => void;
  onOpen: (path: string) => void;
}

/** Ctrl+Shift+F (SPEC §6.5): full-text search over the vault, or every note with a tag. */
export function NoteSearch({ open, onOpenChange, tag, onTagChange, onOpen }: NoteSearchProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);
  const search = useNoteSearch(tag ? "" : debounced, tag);
  const items: NoteSearchResultDto[] = (tag || debounced.trim()) && search.data ? search.data : [];

  return (
    <PickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Поиск по заметкам"
      placeholder={tag ? "Заметки с тегом" : "Слова из заметок…"}
      query={tag ? "" : query}
      onQueryChange={(value) => {
        if (tag) onTagChange("");
        setQuery(value);
      }}
      header={
        tag ? (
          <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-sm text-ink-muted">
            Тег
            <button
              type="button"
              onClick={() => onTagChange("")}
              className="inline-flex items-center gap-1 rounded-full bg-brand/20 px-2 py-0.5 text-lilac"
              aria-label={`Убрать фильтр по тегу #${tag}`}
            >
              #{tag}
              <X aria-hidden className="size-3" />
            </button>
          </div>
        ) : null
      }
      items={items}
      itemKey={(item) => item.path}
      renderItem={(item) => (
        <span className="block">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-ink">{item.title}</span>
            <span className="shrink-0 truncate text-xs text-ink-muted">{folderOf(item.path)}</span>
          </span>
          {item.snippet && (
            <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">
              {snippetParts(item.snippet).map((part, index) =>
                part.hit ? (
                  <mark key={index} className="rounded bg-warning/25 px-0.5 text-ink">
                    {part.text}
                  </mark>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </span>
          )}
        </span>
      )}
      onPick={(item) => {
        onOpenChange(false);
        onOpen(item.path);
      }}
      empty={
        tag
          ? "С этим тегом заметок нет."
          : debounced.trim()
            ? "Ничего не нашлось."
            : "Начни вводить — ищу по тексту всех заметок."
      }
    />
  );
}
