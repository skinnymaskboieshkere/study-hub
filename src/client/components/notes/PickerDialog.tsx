import { cn } from "cn";
import { Search } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface PickerDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  items: readonly T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onPick: (item: T) => void;
  /** Shown above the list (filters) and when nothing is found. */
  header?: ReactNode;
  empty: ReactNode;
}

/** A search field with a list driven by ↑/↓/Enter: the quick switcher and the note search. */
export function PickerDialog<T>(props: PickerDialogProps<T>) {
  const { items, onPick } = props;
  const [active, setActive] = useState(0);
  const [itemsSeen, setItemsSeen] = useState(items);
  if (items !== itemsSeen) {
    setItemsSeen(items);
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (items.length ? (index + step + items.length) % items.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[active];
      if (item) onPick(item);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="top-[12vh] translate-y-0 gap-0 p-0 sm:max-w-xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{props.title}</DialogTitle>
        <DialogDescription className="sr-only">↑ и ↓ — выбор, Enter — открыть</DialogDescription>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search aria-hidden className="size-4 text-ink-muted" />
          <input
            autoFocus
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={props.placeholder}
            aria-label={props.title}
            role="combobox"
            aria-expanded
            aria-controls="picker-list"
            aria-activedescendant={items[active] ? `picker-${active}` : undefined}
            className="h-12 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        {props.header}
        <ul id="picker-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, index) => (
            <li
              key={props.itemKey(item)}
              id={`picker-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseMove={() => setActive(index)}
              onClick={() => onPick(item)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2",
                index === active ? "bg-brand/25" : "hover:bg-surface-2",
              )}
            >
              {props.renderItem(item)}
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-ink-muted">{props.empty}</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
