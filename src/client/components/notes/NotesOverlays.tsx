import type { NoteListItemDto, NoteTemplateDto } from "@shared/api";
import { todayIso } from "@shared/dates";
import { useNavigate } from "react-router";
import { CommandPalette, type NoteCommand } from "./CommandPalette";
import { NoteSearch, QuickSwitcher } from "./NoteDialogs";
import type { NoteMode } from "./NoteWorkspace";
import { RenameDialog } from "./RenameDialog";
import { TrashDialog } from "./TrashDialog";
import { useOpenDailyNote } from "./useOpenDailyNote";
import type { NotesOverlays as Overlays } from "./useNotesOverlays";

interface NotesOverlaysProps {
  overlays: Overlays;
  notes: readonly NoteListItemDto[];
  /** The open note, if any. */
  path: string | null;
  folder: string;
  onOpen: (path: string) => void;
  onCreate: (folder: string, name?: string) => void;
  onMode: (mode: NoteMode) => void;
  templates: readonly NoteTemplateDto[];
  onInsertTemplate: (path: string) => void;
}

/** Dialogs of the notes screen: quick switcher, search, command palette, rename, trash. */
export function NotesOverlays(props: NotesOverlaysProps) {
  const { overlays, path } = props;
  const navigate = useNavigate();
  const daily = useOpenDailyNote();
  const setOpen = (name: Parameters<Overlays["show"]>[0]) => (open: boolean) =>
    open ? overlays.show(name) : overlays.close();

  const commands: NoteCommand[] = [
    { id: "new", label: "Новая заметка", run: () => props.onCreate(props.folder) },
    { id: "daily", label: "Дневная заметка на сегодня", run: () => daily.open(todayIso()) },
    {
      id: "switch",
      label: "Быстрый переход к заметке",
      hint: "Ctrl+O",
      run: () => overlays.show("switcher"),
    },
    {
      id: "search",
      label: "Поиск по заметкам",
      hint: "Ctrl+Shift+F",
      run: () => overlays.showTag(""),
    },
    { id: "graph", label: "Граф заметок", run: () => void navigate("/notes/graph") },
    { id: "trash", label: "Корзина хранилища", run: () => overlays.show("trash") },
    ...(path
      ? [
          {
            id: "rename",
            label: "Переименовать или перенести заметку",
            run: () => overlays.show("rename"),
          },
          { id: "mode-edit", label: "Режим: редактор", run: () => props.onMode("edit") },
          { id: "mode-preview", label: "Режим: просмотр", run: () => props.onMode("preview") },
          { id: "mode-split", label: "Режим: рядом", run: () => props.onMode("split") },
          ...props.templates.map((template) => ({
            id: `template:${template.path}`,
            label: `Вставить шаблон: ${template.name}`,
            run: () => props.onInsertTemplate(template.path),
          })),
        ]
      : []),
  ];

  return (
    <>
      <QuickSwitcher
        open={overlays.open === "switcher"}
        onOpenChange={setOpen("switcher")}
        notes={props.notes}
        onOpen={props.onOpen}
        onCreate={(name) => props.onCreate(props.folder, name)}
      />
      <NoteSearch
        open={overlays.open === "search"}
        onOpenChange={setOpen("search")}
        tag={overlays.searchTag}
        onTagChange={overlays.setSearchTag}
        onOpen={props.onOpen}
      />
      <CommandPalette
        open={overlays.open === "palette"}
        onOpenChange={setOpen("palette")}
        commands={commands}
      />
      {path && overlays.open === "rename" && (
        <RenameDialog path={path} open onOpenChange={setOpen("rename")} onRenamed={props.onOpen} />
      )}
      <TrashDialog
        open={overlays.open === "trash"}
        onOpenChange={setOpen("trash")}
        folder={props.folder}
        onRestored={props.onOpen}
      />
    </>
  );
}
