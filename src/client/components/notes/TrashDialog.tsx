import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePurgeNote, useRestoreNote, useTrash } from "@/app/notes-queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Folder for restored notes: the open note's folder. */
  folder: string;
  onRestored: (path: string) => void;
}

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** The vault's `.trash/` (SPEC §6.5): bring a note back or delete it for good. */
export function TrashDialog({ open, onOpenChange, folder, onRestored }: TrashDialogProps) {
  const trash = useTrash(open);
  const restore = useRestoreNote();
  const purge = usePurgeNote();
  // Deleting for good needs a second click on the same note.
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setConfirming(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Корзина хранилища</DialogTitle>
          <DialogDescription>
            Удалённые заметки лежат в папке .trash — как в Obsidian. Вернуть — в
            {folder ? ` папку «${folder}»` : " корень хранилища"}.
          </DialogDescription>
        </DialogHeader>
        {trash.data && trash.data.length > 0 ? (
          <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
            {trash.data.map((item) => (
              <li key={item.name} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{item.name.replace(/\.md$/i, "")}</span>
                  <span className="text-xs text-ink-muted">{dateFormat.format(item.mtimeMs)}</span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate(
                      { name: item.name, folder },
                      {
                        onSuccess: ({ path }) => {
                          toast.success("Заметка возвращена");
                          onOpenChange(false);
                          onRestored(path);
                        },
                        onError: (error) => toast.error(error.message),
                      },
                    )
                  }
                >
                  <RotateCcw aria-hidden />
                  Вернуть
                </Button>
                <Button
                  size="sm"
                  variant={confirming === item.name ? "destructive" : "ghost"}
                  aria-label={`Удалить «${item.name}» навсегда`}
                  disabled={purge.isPending}
                  onClick={() => {
                    if (confirming !== item.name) return setConfirming(item.name);
                    purge.mutate(item.name, {
                      onSuccess: () => toast.success("Удалено навсегда"),
                      onError: (error) => toast.error(error.message),
                    });
                    setConfirming(null);
                  }}
                >
                  <Trash2 aria-hidden />
                  {confirming === item.name ? "Точно удалить?" : null}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-ink-muted">
            {trash.isPending ? "Загружаю…" : "Корзина пуста."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
