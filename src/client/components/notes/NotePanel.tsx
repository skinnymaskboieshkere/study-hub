import { parseNote } from "@shared/notes";
import { neighborhood } from "@shared/note-links";
import { Link2, ListTree, Tags, Waypoints } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useBacklinks, useNoteGraph } from "@/app/notes-queries";
import { GraphView } from "./GraphView";

interface NotePanelProps {
  path: string;
  text: string;
  onOpenNote: (path: string, line: number | null) => void;
  onGoToHeading: (text: string, line: number) => void;
  onTag: (tag: string) => void;
  /** Tags from the YAML properties (`tags: [...]`), parsed on the server. */
  propertyTags: readonly string[];
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line pb-4 last:border-b-0">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink [&_svg]:size-4 [&_svg]:text-lilac">
        {icon}
        {title}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Right panel (SPEC §6.5): backlinks with context, local graph, the note's tags and outline. */
export function NotePanel(props: NotePanelProps) {
  const { path, text, onOpenNote, onGoToHeading, onTag, propertyTags } = props;
  const backlinks = useBacklinks(path);
  const graph = useNoteGraph();
  const local = useMemo(
    () => (graph.data ? neighborhood(graph.data, path, 1) : null),
    [graph.data, path],
  );
  const parsed = useMemo(() => {
    const note = parseNote(text);
    return { ...note, tags: [...new Set([...propertyTags, ...note.tags])] };
  }, [text, propertyTags]);

  return (
    <div className="space-y-4">
      <Block icon={<Link2 aria-hidden />} title="Обратные ссылки">
        {backlinks.data && backlinks.data.length > 0 ? (
          <ul className="space-y-3">
            {backlinks.data.map((link) => (
              <li key={link.path}>
                <button
                  type="button"
                  onClick={() => onOpenNote(link.path, link.mentions[0]?.line ?? null)}
                  className="text-left text-sm font-medium text-lilac hover:underline"
                >
                  {link.title}
                </button>
                <ul className="mt-1 space-y-1">
                  {link.mentions.map((mention) => (
                    <li key={mention.line}>
                      <button
                        type="button"
                        onClick={() => onOpenNote(link.path, mention.line)}
                        className="line-clamp-3 w-full rounded-md bg-surface-2 px-2 py-1.5 text-left text-xs leading-relaxed text-ink-muted hover:text-ink"
                      >
                        {mention.context}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">
            {backlinks.isPending ? "Ищу…" : "Пока ни одна заметка не ссылается сюда."}
          </p>
        )}
      </Block>

      <Block icon={<Waypoints aria-hidden />} title="Локальный граф">
        {local && local.nodes.length > 1 ? (
          <GraphView
            graph={local}
            coloring="track"
            current={path}
            labelsFrom={0}
            className="h-52 overflow-hidden rounded-lg bg-night/40"
            onOpen={(node) => !node.missing && onOpenNote(node.id, null)}
          />
        ) : (
          <p className="text-xs text-ink-muted">Связей пока нет — поставь [[ссылку]].</p>
        )}
      </Block>

      <Block icon={<Tags aria-hidden />} title="Теги">
        {parsed.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {parsed.tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => onTag(tag)}
                  className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-lilac hover:bg-brand/25"
                >
                  #{tag}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">Тегов нет. Напиши #тег в тексте.</p>
        )}
      </Block>

      <Block icon={<ListTree aria-hidden />} title="Оглавление">
        {parsed.headings.length > 0 ? (
          <ul className="space-y-1">
            {parsed.headings.map((heading) => (
              <li key={heading.line} style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}>
                <button
                  type="button"
                  onClick={() => onGoToHeading(heading.text, heading.line)}
                  className="line-clamp-2 text-left text-sm text-ink-muted hover:text-ink"
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">Заголовков нет.</p>
        )}
      </Block>
    </div>
  );
}
