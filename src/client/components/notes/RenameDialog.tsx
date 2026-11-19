import { noteName } from "@shared/notes";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useFolders, useRenameNote } from "@/app/notes-queries";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pluralRu } from "@/lib/format";

const ROOT = "__root__";

interface RenameDialogProps {
  path: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new path after links were rewritten. */
  onRenamed: (path: string) => void;
}

const folderOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/** Rename or move a note; every `[[link]]` to it is rewritten (SPEC §6.5, §9.3). */
export function RenameDialog({ path, open, onOpenChange, onRenamed }: RenameDialogProps) {
  const folders = useFolders(open);
  const rename = useRenameNote();
  const [name, setName] = useState(noteName(path));
  const [folder, setFolder] = useState(folderOf(path));

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    rename.mutate(
      { from: path, to: folder ? `${folder}/${clean}.md` : `${clean}.md` },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          toast.success(
            result.links > 0
              ? `Готово. Обновлено ${result.links} ${pluralRu(result.links, ["ссылка", "ссылки", "ссылок"])} в ${result.files} ${pluralRu(result.files, ["заметке", "заметках", "заметках"])}`
              : "Готово. Ссылок на заметку не было",
          );
          onRenamed(result.path);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Переименовать заметку</DialogTitle>
            <DialogDescription>
              Ссылки на неё во всём хранилище поменяются сами — как в Obsidian.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-name">Название</Label>
            <Input
              id="rename-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rename-folder">Папка</Label>
            <Select
              value={folder || ROOT}
              onValueChange={(value) => setFolder(value === ROOT ? "" : value)}
            >
              <SelectTrigger id="rename-folder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>Корень хранилища</SelectItem>
                {(folders.data ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || rename.isPending}>
              {rename.isPending ? "Переименовываю…" : "Переименовать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
