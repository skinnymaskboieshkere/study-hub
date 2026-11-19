import type { NoteTemplateDto } from "@shared/api";
import { LayoutTemplate, TextCursorInput, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteActionsProps {
  title: string;
  templates: readonly NoteTemplateDto[];
  onRename: () => void;
  onInsertTemplate: (path: string) => void;
  onTrash: () => void;
}

/** Note toolbar: rename or move, insert a template, delete to the vault's trash. */
export function NoteActions(props: NoteActionsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Переименовать или перенести"
        title="Переименовать или перенести"
        onClick={props.onRename}
      >
        <TextCursorInput />
      </Button>
      {props.templates.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Вставить шаблон"
              title="Вставить шаблон"
            >
              <LayoutTemplate />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Вставить шаблон</DropdownMenuLabel>
            {props.templates.map((template) => (
              <DropdownMenuItem
                key={template.path}
                onSelect={() => props.onInsertTemplate(template.path)}
              >
                {template.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
              Заметка переедет в папку .trash хранилища — как в Obsidian. Вернуть её можно, перенеся
              файл обратно. Ссылки на неё станут пустыми.
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
    </>
  );
}
