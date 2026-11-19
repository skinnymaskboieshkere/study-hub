import { useMemo, useState } from "react";
import { PickerDialog } from "./PickerDialog";

export interface NoteCommand {
  id: string;
  label: string;
  /** Keyboard shortcut shown on the right. */
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly NoteCommand[];
}

/** Ctrl+P (SPEC §6.5): every notes action by name, like Obsidian's command palette. */
export function CommandPalette({ open, onOpenChange, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((command) =>
      words.every((word) => command.label.toLowerCase().includes(word)),
    );
  }, [commands, query]);

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  return (
    <PickerDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Палитра команд"
      placeholder="Команда…"
      query={query}
      onQueryChange={setQuery}
      items={items}
      itemKey={(command) => command.id}
      renderItem={(command) => (
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-ink">{command.label}</span>
          {command.hint && <kbd className="font-mono text-xs text-ink-muted">{command.hint}</kbd>}
        </span>
      )}
      onPick={(command) => {
        close();
        // Let the palette close first: a command may open another dialog.
        window.setTimeout(command.run, 0);
      }}
      empty="Такой команды нет."
    />
  );
}
