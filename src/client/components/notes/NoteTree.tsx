import type { NoteTreeNodeDto } from "@shared/api";
import { cn } from "cn";
import { ChevronRight, FileText, Folder, FolderOpen, Plus } from "lucide-react";
import { useState } from "react";

interface NoteTreeProps {
  nodes: NoteTreeNodeDto[];
  activePath: string | null;
  onOpen: (path: string) => void;
  onCreateIn: (folder: string) => void;
}

/** "Матанализ/Пределы.md" → ["Матанализ"]: folders to open so the note is visible. */
function ancestors(path: string | null): string[] {
  if (!path) return [];
  const parts = path.split("/").slice(0, -1);
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

/** Vault folders and notes (SPEC §6.5). The open note's folders unfold by themselves. */
export function NoteTree({ nodes, activePath, onOpen, onCreateIn }: NoteTreeProps) {
  const [open, setOpen] = useState(() => new Set(ancestors(activePath)));
  const [shownFor, setShownFor] = useState(activePath);
  if (activePath !== shownFor) {
    setShownFor(activePath);
    const missing = ancestors(activePath).filter((folder) => !open.has(folder));
    if (missing.length) setOpen(new Set([...open, ...missing]));
  }

  const toggle = (folder: string) => {
    const next = new Set(open);
    if (next.has(folder)) next.delete(folder);
    else next.add(folder);
    setOpen(next);
  };

  const render = (items: NoteTreeNodeDto[], depth: number) =>
    items.map((node) => {
      const indent = { paddingLeft: `${8 + depth * 14}px` };
      if (node.type === "folder") {
        const expanded = open.has(node.path);
        return (
          <li key={node.path}>
            <div className="group flex items-center rounded-lg hover:bg-surface-2">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggle(node.path)}
                className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-1 text-left text-sm text-ink-muted hover:text-ink"
                style={indent}
              >
                <ChevronRight
                  aria-hidden
                  className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-90")}
                />
                {expanded ? (
                  <FolderOpen aria-hidden className="size-4 shrink-0 text-lilac/80" />
                ) : (
                  <Folder aria-hidden className="size-4 shrink-0 text-lilac/80" />
                )}
                <span className="truncate">{node.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Новая заметка в папке «${node.name}»`}
                title="Новая заметка в папке"
                onClick={() => onCreateIn(node.path)}
                className="mr-1 rounded p-1 text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            {expanded && node.children && node.children.length > 0 && (
              <ul>{render(node.children, depth + 1)}</ul>
            )}
          </li>
        );
      }
      const active = node.path === activePath;
      return (
        <li key={node.path}>
          <button
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onOpen(node.path)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-sm",
              active ? "bg-brand/20 text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
            style={{ paddingLeft: `${8 + depth * 14 + 18}px` }}
          >
            <FileText aria-hidden className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{node.name}</span>
          </button>
        </li>
      );
    });

  if (nodes.length === 0) {
    return <p className="px-2 py-3 text-sm text-ink-muted">В хранилище пока нет заметок.</p>;
  }
  return <ul className="space-y-0.5">{render(nodes, 0)}</ul>;
}
