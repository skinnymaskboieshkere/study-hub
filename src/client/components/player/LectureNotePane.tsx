import { timecodeMarkdown, parseYoutubeLink } from "@shared/note-templates";
import { resolveLink } from "@shared/notes";
import type { NoteListItemDto } from "@shared/api";
import { Eye, NotebookPen, PenLine, SquareArrowOutUpRight, X } from "lucide-react";
import { useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useCreateLectureNote,
  useLectureNote,
  useNoteList,
  useNotesStatus,
  useTags,
} from "@/app/notes-queries";
import { MarkdownPreview } from "@/components/notes/MarkdownPreview";
import { NoteEditor, type NoteEditorHandle } from "@/components/notes/NoteEditor";
import { useNoteCompletion } from "@/components/notes/useNoteCompletion";
import { useNoteDocument } from "@/components/notes/useNoteDocument";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadImage } from "@/lib/note-assets";

export interface LectureNoteHandle {
  /** The timecode hotkey pressed outside the editor. */
  insertTimecode: () => void;
}

interface LectureNotePaneProps {
  youtubeId: string;
  courseSlug: string;
  currentTime: () => number;
  /** A YouTube link or timecode in the note was clicked. */
  onOpenVideo: (videoId: string, seconds: number) => void;
  onClose: () => void;
  ref?: Ref<LectureNoteHandle>;
}

const NO_NOTES: NoteListItemDto[] = [];

const notesUrl = (path: string) => `/notes?path=${encodeURIComponent(path)}`;

/** The lecture note next to the video (SPEC §6.6): "Конспект" creates it from the template. */
export function LectureNotePane(props: LectureNotePaneProps) {
  const status = useNotesStatus();
  const available = Boolean(status.data?.available);
  const lecture = useLectureNote(props.youtubeId, available);
  const create = useCreateLectureNote();

  let body;
  if (status.isPending || (available && lecture.isPending)) {
    body = <Skeleton className="h-64 rounded-xl bg-surface-2" />;
  } else if (!available) {
    body = (
      <p className="text-sm text-ink-muted">
        Хранилище заметок не подключено: укажи <code>VAULT_PATH</code> в файле .env и перезапусти
        Study Hub.
      </p>
    );
  } else if (!lecture.data) {
    body = (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-ink">Конспекта к этой лекции пока нет.</p>
        <p className="text-sm text-ink-muted">
          Заметка появится в твоём Obsidian: Courses → курс → лекция, с разделами «Главные идеи»,
          «Таймкоды», «Формулы» и другими. Alt+T вставит таймкод текущего момента.
        </p>
        <Button
          disabled={create.isPending}
          onClick={() =>
            create.mutate(
              { youtubeId: props.youtubeId, course: props.courseSlug },
              {
                onSuccess: (note) => note.created && toast.success("Конспект создан"),
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <NotebookPen aria-hidden />
          Создать конспект
        </Button>
      </div>
    );
  } else {
    body = <LectureNote key={lecture.data} path={lecture.data} {...props} />;
  }

  return (
    <section
      aria-label="Конспект лекции"
      className="flex h-full min-h-[60vh] flex-col rounded-2xl border border-line bg-surface p-4"
    >
      {!lecture.data && (
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Конспект</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Скрыть конспект"
            onClick={props.onClose}
          >
            <X />
          </Button>
        </div>
      )}
      {body}
    </section>
  );
}

function LectureNote({ path, ...props }: LectureNotePaneProps & { path: string }) {
  const navigate = useNavigate();
  const document = useNoteDocument(path);
  const list = useNoteList();
  const tags = useTags();
  const editor = useRef<NoteEditorHandle>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const paths = useMemo(() => (list.data ?? []).map((note) => note.path), [list.data]);
  const timecode = () => timecodeMarkdown(props.youtubeId, props.currentTime());

  useImperativeHandle(props.ref, () => ({
    insertTimecode() {
      if (mode !== "edit") {
        setMode("edit");
        toast("Таймкод вставляется в режиме редактора — нажми Alt+T ещё раз");
        return;
      }
      editor.current?.insertTimecode(timecode());
    },
  }));

  const completion = useNoteCompletion({
    notes: list.data ?? NO_NOTES,
    tags: tags.data,
    paths,
    path,
    text: document.text,
  });

  // Links to other notes open the notes screen; the video keeps its place (saved on leave).
  const openNote = (target: string) => {
    const resolved = resolveLink(target, paths, path);
    if (resolved) void navigate(notesUrl(resolved));
    else toast(`Заметки «${target}» ещё нет — создай её в разделе «Заметки»`);
  };
  const openUrl = (url: string) => {
    const video = parseYoutubeLink(url);
    if (!video) return false;
    props.onOpenVideo(video.videoId, video.tSec);
    return true;
  };

  const { doc } = document;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-semibold text-ink" title={path}>
          {path.split("/").pop()?.replace(/\.md$/i, "")}
        </h2>
        <span className="text-xs text-ink-muted" role="status">
          {document.status === "saving"
            ? "Сохраняю…"
            : document.status === "dirty"
              ? "Есть правки"
              : document.status === "conflict"
                ? "Конфликт"
                : document.status === "error"
                  ? "Не сохранено"
                  : "Сохранено"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={mode === "edit" ? "Просмотр" : "Редактор"}
          title={mode === "edit" ? "Просмотр" : "Редактор"}
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
        >
          {mode === "edit" ? <Eye /> : <PenLine />}
        </Button>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Открыть в разделе «Заметки»">
          <Link to={notesUrl(path)} title="Открыть в разделе «Заметки»">
            <SquareArrowOutUpRight />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Скрыть конспект" onClick={props.onClose}>
          <X />
        </Button>
      </div>

      {document.conflict && (
        <div
          role="alert"
          className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-warning/10 p-2 text-xs text-ink"
        >
          Конспект изменили снаружи.
          <Button size="sm" variant="secondary" onClick={document.takeDisk}>
            Взять с диска
          </Button>
          <Button size="sm" onClick={document.keepMine}>
            Оставить мою
          </Button>
        </div>
      )}

      <div className="min-h-[50vh] flex-1 overflow-y-auto lg:min-h-0">
        {doc.phase === "ready" ? (
          mode === "edit" ? (
            <NoteEditor
              key={`${doc.path}:${doc.version}`}
              ref={editor}
              initialText={doc.initialText}
              onChange={document.onChange}
              completion={completion}
              onOpenLink={(target) => openNote(target)}
              onOpenUrl={openUrl}
              onPasteImage={uploadImage}
              onTimecode={timecode}
            />
          ) : (
            <MarkdownPreview
              text={document.text}
              path={path}
              paths={paths}
              onOpenNote={(target) => void navigate(notesUrl(target))}
              onCreateNote={(name) => openNote(name)}
              onTag={(tag) => void navigate(`/notes?tag=${encodeURIComponent(tag)}`)}
              onHeading={() => undefined}
              onVideoLink={props.onOpenVideo}
            />
          )
        ) : doc.phase === "error" ? (
          <p className="text-sm text-danger">{doc.message}</p>
        ) : (
          <Skeleton className="h-64 rounded-xl bg-surface-2" />
        )}
      </div>
    </div>
  );
}
