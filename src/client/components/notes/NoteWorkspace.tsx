import { cn } from "cn";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Columns2,
  Eye,
  LoaderCircle,
  PenLine,
  Trash2,
} from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CompletionData } from "@/lib/editor/completion";
import { MarkdownPreview } from "./MarkdownPreview";
import { NoteEditor, type NoteEditorHandle } from "./NoteEditor";
import type { SaveStatus } from "./useNoteDocument";

export type NoteMode = "edit" | "preview" | "split";

interface NoteWorkspaceProps {
  path: string;
  title: string;
  /** Changes when the text is replaced from disk: remounts the editor. */
  editorKey: string;
  initialText: string;
  text: string;
  status: SaveStatus;
  conflict: boolean;
  mode: NoteMode;
  onModeChange: (mode: NoteMode) => void;
  onChange: (text: string) => void;
  onTakeDisk: () => void;
  onKeepMine: () => void;
  onTrash: () => void;
  editorRef: Ref<NoteEditorHandle>;
  completion: CompletionData;
  paths: readonly string[];
  onOpenLink: (target: string, heading: string | null) => void;
  onOpenNote: (path: string, heading: string | null) => void;
  onCreateNote: (name: string) => void;
  onTag: (tag: string) => void;
  onHeading: (heading: string) => void;
}

const STATUS: Record<SaveStatus, { icon: ReactNode; label: string }> = {
  saved: { icon: <Check aria-hidden />, label: "Сохранено" },
  dirty: { icon: <PenLine aria-hidden />, label: "Есть правки" },
  saving: { icon: <LoaderCircle aria-hidden className="animate-spin" />, label: "Сохраняю…" },
  error: { icon: <CloudOff aria-hidden />, label: "Не сохранено" },
  conflict: { icon: <AlertTriangle aria-hidden />, label: "Конфликт" },
};

const MODE_ITEM =
  "h-8 rounded-full border border-line bg-surface-2 px-3 text-xs text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink";

/** The open note: title, save state, modes "редактор / просмотр / рядом" (SPEC §6.5). */
export function NoteWorkspace({ editorRef, ...props }: NoteWorkspaceProps) {
  const status = STATUS[props.status];
  const editor = (
    <NoteEditor
      key={props.editorKey}
      ref={editorRef}
      initialText={props.initialText}
      onChange={props.onChange}
      completion={props.completion}
      onOpenLink={props.onOpenLink}
    />
  );
  const preview = (
    <MarkdownPreview
      text={props.text}
      path={props.path}
      paths={props.paths}
      onOpenNote={props.onOpenNote}
      onCreateNote={props.onCreateNote}
      onTag={props.onTag}
      onHeading={props.onHeading}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3">
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold text-ink" title={props.path}>
          {props.title}
        </h1>
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs [&_svg]:size-3.5",
            props.status === "error" || props.status === "conflict"
              ? "text-warning"
              : "text-ink-muted",
          )}
        >
          {status.icon}
          {status.label}
        </span>
        <ToggleGroup
          type="single"
          aria-label="Вид заметки"
          value={props.mode}
          onValueChange={(value) => value && props.onModeChange(value as NoteMode)}
          spacing={1}
        >
          <ToggleGroupItem value="edit" className={MODE_ITEM} aria-label="Редактор">
            <PenLine aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Редактор</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="preview" className={MODE_ITEM} aria-label="Просмотр">
            <Eye aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Просмотр</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="split"
            className={cn(MODE_ITEM, "hidden lg:flex")}
            aria-label="Рядом"
          >
            <Columns2 aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">Рядом</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Удалить в корзину хранилища"
              title="Удалить (в папку .trash)"
            >
              <Trash2 />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить «{props.title}»?</DialogTitle>
              <DialogDescription>
                Заметка переедет в папку .trash хранилища — как в Obsidian. Вернуть её можно,
                перенеся файл обратно. Ссылки на неё станут пустыми.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Отмена</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={props.onTrash}>
                  Удалить
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {props.conflict && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
        >
          <AlertTriangle aria-hidden className="size-5 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-ink">
            Заметку изменили снаружи (Obsidian или OneDrive), а здесь есть несохранённые правки.
          </p>
          <Button size="sm" variant="secondary" onClick={props.onTakeDisk}>
            Взять версию с диска
          </Button>
          <Button size="sm" onClick={props.onKeepMine}>
            Оставить мою
          </Button>
        </div>
      )}

      <div
        className={cn(
          "mt-3 min-h-[60vh] flex-1 lg:min-h-0",
          props.mode === "split" && "lg:grid lg:grid-cols-2 lg:gap-6",
        )}
      >
        {props.mode !== "preview" && (
          <div
            className={cn(
              "h-full min-h-0",
              props.mode === "split" && "lg:border-r lg:border-line lg:pr-4",
            )}
          >
            {editor}
          </div>
        )}
        {props.mode !== "edit" && (
          <div
            className={cn(
              "h-full min-h-0 overflow-y-auto pb-24",
              props.mode === "split" && "hidden lg:block",
            )}
          >
            {preview}
          </div>
        )}
      </div>
    </div>
  );
}
