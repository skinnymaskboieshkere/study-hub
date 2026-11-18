import { fillTemplate } from "@shared/note-templates";
import { frontmatterTags, noteName } from "@shared/notes";
import { FolderX, NotebookPen } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  fetchNote,
  useNoteList,
  useNotesStatus,
  useNotesSync,
  useTags,
  useTemplates,
  useTrashNote,
} from "@/app/notes-queries";
import { NoteSearch, QuickSwitcher } from "@/components/notes/NoteDialogs";
import type { NoteEditorHandle } from "@/components/notes/NoteEditor";
import { NotePanel } from "@/components/notes/NotePanel";
import { NoteSidebar } from "@/components/notes/NoteSidebar";
import { NoteWorkspace, type NoteMode } from "@/components/notes/NoteWorkspace";
import { useNoteCompletion } from "@/components/notes/useNoteCompletion";
import { useNoteDocument } from "@/components/notes/useNoteDocument";
import { useNoteJump } from "@/components/notes/useNoteJump";
import { useNoteNavigation } from "@/components/notes/useNoteNavigation";
import { useNotesShortcuts } from "@/components/notes/useNotesShortcuts";
import { QueryError } from "@/components/QueryState";
import { StateMessage } from "@/components/StateMessage";
import { Skeleton } from "@/components/ui/skeleton";

const MODE_KEY = "studyhub.noteMode";

function readMode(): NoteMode {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return value === "preview" || value === "split" ? value : "edit";
  } catch {
    return "edit";
  }
}

const folderOf = (path: string | null) =>
  path?.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

/** /notes?path=… — the Obsidian vault: tree | note | links and outline (SPEC §6.5). */
export function NotesPage() {
  const status = useNotesStatus();
  const ready = Boolean(status.data?.available);
  useNotesSync(ready);

  if (status.isPending) return <Skeleton className="mt-6 h-[70vh] rounded-2xl bg-surface" />;
  if (status.isError)
    return <QueryError error={status.error} onRetry={() => void status.refetch()} />;
  if (!status.data.configured || !status.data.available) {
    return (
      <div className="pt-8">
        <StateMessage
          icon={FolderX}
          title={status.data.configured ? "Папка хранилища не найдена" : "Хранилище не подключено"}
        >
          В файле <code>.env</code> в папке проекта укажи путь к Obsidian vault:{" "}
          <code>VAULT_PATH=C:\Users\…\OneDrive\Документы\Obsidian Vault</code> — и перезапусти Study
          Hub. Заметки остаются обычными файлами .md в этой папке.
        </StateMessage>
      </div>
    );
  }
  return <NotesScreen />;
}

function NotesScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const path = params.get("path");
  const document = useNoteDocument(path);
  const list = useNoteList();
  const tags = useTags();
  const templates = useTemplates();
  const trashNote = useTrashNote();
  const editor = useRef<NoteEditorHandle>(null);
  const [mode, setMode] = useState<NoteMode>(readMode);
  const [switcher, setSwitcher] = useState(false);
  const [search, setSearch] = useState(false);
  const [searchTag, setSearchTag] = useState("");

  const notes = useMemo(() => list.data ?? [], [list.data]);
  const paths = useMemo(() => notes.map((note) => note.path), [notes]);
  const { open, create, openLink, openVideo, openUrl } = useNoteNavigation(path, paths);
  const completion = useNoteCompletion({
    notes,
    tags: tags.data,
    paths,
    path,
    text: document.text,
  });
  useNoteJump({
    ready: document.doc.phase === "ready",
    text: document.text,
    preview: mode === "preview",
    editor,
  });

  const showTag = useCallback((tag: string) => {
    setSearchTag(tag);
    setSearch(true);
  }, []);
  useNotesShortcuts({ onSwitch: () => setSwitcher(true), onSearch: () => showTag("") });

  // /notes?tag=… (a tag clicked next to the video) opens the tag search right away.
  const tagParam = params.get("tag");
  const [shownTagParam, setShownTagParam] = useState<string | null>(null);
  if (tagParam && tagParam !== shownTagParam) {
    setShownTagParam(tagParam);
    setSearchTag(tagParam);
    setSearch(true);
  }

  async function insertTemplate(templatePath: string) {
    if (mode === "preview") {
      changeMode("edit");
      toast("Шаблон вставляется в режиме редактора — выбери его ещё раз");
      return;
    }
    const template = await fetchNote(templatePath).catch(() => null);
    if (!template) return void toast.error("Шаблон не открыть");
    editor.current?.insert(fillTemplate(template.content, path ? noteName(path) : "", new Date()));
  }

  function changeMode(next: NoteMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Private mode: the choice is not remembered.
    }
  }

  function trash() {
    if (!path) return;
    trashNote.mutate(path, {
      onSuccess: () => {
        toast.success("Заметка перемещена в .trash хранилища");
        void navigate("/notes");
      },
      onError: (error) => toast.error(error.message),
    });
  }

  const { doc } = document;
  const frontmatter = doc.phase === "ready" ? doc.frontmatter : null;
  const propertyTags = useMemo(
    () => frontmatterTags(frontmatter?.tags ?? frontmatter?.tag),
    [frontmatter],
  );
  return (
    <div className="grid grid-cols-1 gap-6 pt-4 lg:h-[calc(100dvh-9.5rem)] lg:grid-cols-[240px_minmax(0,1fr)_260px]">
      <aside className="min-h-0 rounded-2xl border border-line bg-surface p-3 lg:h-full">
        <NoteSidebar
          activePath={path}
          folder={folderOf(path)}
          onOpen={(target) => open(target)}
          onCreateNote={(folder) => create(folder)}
          onSwitch={() => setSwitcher(true)}
          onSearch={() => {
            setSearchTag("");
            setSearch(true);
          }}
          onTag={showTag}
        />
      </aside>

      <section aria-label="Заметка" className="min-h-0 min-w-0">
        {doc.phase === "idle" && (
          <StateMessage icon={NotebookPen} title="Выбери заметку слева или создай новую">
            Ctrl+O — быстрый переход по названию, Ctrl+Shift+F — поиск по тексту всех заметок. В
            тексте: <code>[[</code> — ссылка на заметку, <code>#</code> — тег, <code>$…$</code> —
            формула.
          </StateMessage>
        )}
        {doc.phase === "loading" && <Skeleton className="h-full min-h-96 rounded-2xl bg-surface" />}
        {doc.phase === "error" && (
          <StateMessage icon={FolderX} tone="error" title="Заметку не открыть">
            {doc.message}
          </StateMessage>
        )}
        {doc.phase === "ready" && (
          <NoteWorkspace
            path={doc.path}
            title={doc.path.split("/").pop()?.replace(/\.md$/i, "") ?? doc.path}
            editorKey={`${doc.path}:${doc.version}`}
            initialText={doc.initialText}
            text={document.text}
            status={document.status}
            conflict={Boolean(document.conflict)}
            mode={mode}
            onModeChange={changeMode}
            onChange={document.onChange}
            onTakeDisk={document.takeDisk}
            onKeepMine={document.keepMine}
            onTrash={trash}
            editorRef={editor}
            completion={completion}
            paths={paths}
            onOpenLink={openLink}
            onOpenNote={(target, heading) => open(target, { heading })}
            onCreateNote={(name) => create("", name)}
            onTag={showTag}
            onHeading={(heading) => path && open(path, { heading })}
            onVideoLink={openVideo}
            onOpenUrl={openUrl}
            templates={templates.data ?? []}
            onInsertTemplate={(template) => void insertTemplate(template)}
          />
        )}
      </section>

      <aside
        aria-label="Связи заметки"
        className="min-h-0 overflow-y-auto rounded-2xl border border-line bg-surface p-4 lg:h-full"
      >
        {doc.phase === "ready" ? (
          <NotePanel
            path={doc.path}
            text={document.text}
            onOpenNote={(target, line) => open(target, { line })}
            onGoToHeading={(heading, line) =>
              mode === "preview" ? open(doc.path, { heading }) : editor.current?.goToLine(line)
            }
            onTag={showTag}
            propertyTags={propertyTags}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            Здесь появятся обратные ссылки, теги и оглавление.
          </p>
        )}
      </aside>

      <QuickSwitcher
        open={switcher}
        onOpenChange={setSwitcher}
        notes={notes}
        onOpen={(target) => open(target)}
        onCreate={(name) => create(folderOf(path), name)}
      />
      <NoteSearch
        open={search}
        onOpenChange={setSearch}
        tag={searchTag}
        onTagChange={setSearchTag}
        onOpen={(target) => open(target)}
      />
    </div>
  );
}
