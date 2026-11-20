import {
  CalendarDays,
  FilePlus,
  FolderPlus,
  Hash,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  Waypoints,
} from "lucide-react";
import { Link } from "react-router";
import { todayIso } from "@shared/dates";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { subjectChipOptions } from "@/app/labels";
import { useCreateFolder, useNoteTree, useTags } from "@/app/notes-queries";
import { FilterChips } from "@/components/FilterChips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { filterTreeBySubject, folderPaths, treeSubjects } from "@/lib/notes-filter";
import { NoteTree } from "./NoteTree";
import { useOpenDailyNote } from "./useOpenDailyNote";

interface NoteSidebarProps {
  activePath: string | null;
  /** Folder for new notes and folders: the open note's folder. */
  folder: string;
  onOpen: (path: string) => void;
  onCreateNote: (folder: string) => void;
  onSwitch: () => void;
  onSearch: () => void;
  onTag: (tag: string) => void;
  onTrash: () => void;
}

/** Left column: actions, the file tree and every tag of the vault (SPEC §6.5). */
export function NoteSidebar(props: NoteSidebarProps) {
  const tree = useNoteTree();
  const tags = useTags();
  const createFolder = useCreateFolder();
  const daily = useOpenDailyNote();
  const [folderDialog, setFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const present = tree.data ? treeSubjects(tree.data) : [];
  // A subject whose last note is gone stops filtering.
  const active = subjects.filter((subject) => present.some((item) => item === subject));
  const shown = tree.data ? filterTreeBySubject(tree.data, active) : null;

  function submitFolder(event: FormEvent) {
    event.preventDefault();
    createFolder.mutate(
      { parent: props.folder, name: folderName },
      {
        onSuccess: ({ path }) => {
          toast.success(`Папка «${path}» создана`);
          setFolderDialog(false);
          setFolderName("");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" onClick={() => props.onCreateNote(props.folder)}>
          <FilePlus aria-hidden />
          Заметка
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Дневная заметка на сегодня"
          title="Дневная заметка на сегодня"
          disabled={daily.pending}
          onClick={() => daily.open(todayIso())}
        >
          <CalendarDays />
        </Button>
        <Button
          asChild
          size="icon-sm"
          variant="ghost"
          aria-label="Граф заметок"
          title="Граф заметок"
        >
          <Link to="/notes/graph">
            <Waypoints />
          </Link>
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Корзина хранилища"
          title="Корзина хранилища"
          onClick={props.onTrash}
        >
          <Trash2 />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Новая папка"
          title="Новая папка"
          onClick={() => setFolderDialog(true)}
        >
          <FolderPlus />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Быстрый переход (Ctrl+O)"
          title="Быстрый переход (Ctrl+O)"
          onClick={props.onSwitch}
        >
          <SquareArrowOutUpRight />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Поиск по заметкам (Ctrl+Shift+F)"
          title="Поиск по заметкам (Ctrl+Shift+F)"
          onClick={props.onSearch}
        >
          <Search />
        </Button>
      </div>

      {present.length > 0 && (
        <FilterChips
          label="Предмет"
          size="sm"
          options={subjectChipOptions(present)}
          value={active}
          onValueChange={setSubjects}
        />
      )}

      <nav aria-label="Файлы хранилища" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {shown ? (
          <NoteTree
            key={active.join()}
            nodes={shown}
            defaultOpen={active.length > 0 ? folderPaths(shown) : undefined}
            activePath={props.activePath}
            onOpen={props.onOpen}
            onCreateIn={props.onCreateNote}
          />
        ) : (
          <p className="px-2 text-sm text-ink-muted">
            {tree.isError ? tree.error.message : "Загружаю…"}
          </p>
        )}
      </nav>

      {tags.data && tags.data.length > 0 && (
        <section
          aria-labelledby="vault-tags"
          className="max-h-[30%] overflow-y-auto border-t border-line pt-3"
        >
          <h2
            id="vault-tags"
            className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted"
          >
            <Hash aria-hidden className="size-3.5" />
            Теги хранилища
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {tags.data.map((tag) => (
              <li key={tag.tag}>
                <button
                  type="button"
                  onClick={() => props.onTag(tag.tag)}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-muted hover:bg-brand/20 hover:text-ink"
                >
                  #{tag.tag} <span className="opacity-60">{tag.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent>
          <form onSubmit={submitFolder} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Новая папка</DialogTitle>
              <DialogDescription>
                {props.folder ? `Внутри «${props.folder}».` : "В корне хранилища."}
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Например: Матанализ"
              aria-label="Имя папки"
              maxLength={200}
            />
            <DialogFooter>
              <Button type="submit" disabled={!folderName.trim() || createFolder.isPending}>
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
