import { ArrowLeft, Waypoints } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateNote, useNoteGraph, useNotesStatus, useTags } from "@/app/notes-queries";
import { GraphView } from "@/components/notes/GraphView";
import { QueryError } from "@/components/QueryState";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { pluralRu } from "@/lib/format";
import { filterGraph, type GraphColoring } from "@/lib/graph-style";

const ALL_TAGS = "__all__";
const TOGGLE =
  "h-8 rounded-full border border-line bg-surface-2 px-3 text-xs text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink";

const LEGEND = [
  { color: "#a78bfa", label: "Фундамент" },
  { color: "#60a5fa", label: "Инженерная база" },
  { color: "#34d399", label: "Робототехника" },
  { color: "#22d3ee", label: "Computer Vision" },
  { color: "#8f8aa8", label: "Остальные заметки" },
  { color: "#4b4560", label: "Ещё не созданы" },
];

/** /notes/graph — every note and link of the vault (SPEC §6.5), colored by track or tag. */
export function NoteGraphPage() {
  const navigate = useNavigate();
  const status = useNotesStatus();
  const available = Boolean(status.data?.available);
  const graph = useNoteGraph(available);
  const tags = useTags(available);
  const createNote = useCreateNote();
  const [coloring, setColoring] = useState<GraphColoring>("track");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [showMissing, setShowMissing] = useState(true);
  const [showOrphans, setShowOrphans] = useState(true);

  const visible = useMemo(
    () =>
      graph.data
        ? filterGraph(graph.data, { query, tag, showMissing, showOrphans })
        : { nodes: [], links: [] },
    [graph.data, query, tag, showMissing, showOrphans],
  );

  if (status.data && !available) {
    return (
      <div className="pt-8">
        <StateMessage icon={Waypoints} title="Хранилище не подключено">
          Укажи VAULT_PATH в файле .env и перезапусти Study Hub.
        </StateMessage>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4 lg:h-[calc(100dvh-9.5rem)]">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <Link
            to="/notes"
            className="inline-flex items-center gap-1 text-sm text-lilac hover:underline"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Заметки
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Граф заметок
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {visible.nodes.length}{" "}
            {pluralRu(visible.nodes.length, ["заметка", "заметки", "заметок"])} ·{" "}
            {visible.links.length} {pluralRu(visible.links.length, ["связь", "связи", "связей"])}.
            Клик — открыть заметку, колесо — масштаб.
          </p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти заметку"
          aria-label="Фильтр по названию"
          className="w-48"
        />
        <Select
          value={tag || ALL_TAGS}
          onValueChange={(value) => setTag(value === ALL_TAGS ? "" : value)}
        >
          <SelectTrigger aria-label="Фильтр по тегу" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TAGS}>Все теги</SelectItem>
            {(tags.data ?? []).map((item) => (
              <SelectItem key={item.tag} value={item.tag}>
                #{item.tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          aria-label="Цвет точек"
          value={coloring}
          onValueChange={(value) => value && setColoring(value as GraphColoring)}
          spacing={1}
        >
          <ToggleGroupItem value="track" className={TOGGLE}>
            По трекам
          </ToggleGroupItem>
          <ToggleGroupItem value="tag" className={TOGGLE}>
            По тегам
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="graph-missing" checked={showMissing} onCheckedChange={setShowMissing} />
          <Label htmlFor="graph-missing" className="text-xs">
            Несозданные
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="graph-orphans" checked={showOrphans} onCheckedChange={setShowOrphans} />
          <Label htmlFor="graph-orphans" className="text-xs">
            Без связей
          </Label>
        </div>
      </div>

      {graph.isError ? (
        <QueryError error={graph.error} onRetry={() => void graph.refetch()} />
      ) : !graph.data ? (
        <Skeleton className="min-h-[60vh] flex-1 rounded-2xl bg-surface" />
      ) : visible.nodes.length === 0 ? (
        <StateMessage icon={Waypoints} title="Нечего показать">
          {graph.data.nodes.length === 0
            ? "В хранилище пока нет заметок. Свяжи их ссылками [[…]] — и граф появится."
            : "Под фильтры не подошла ни одна заметка."}
          <div className="mt-3">
            <Button variant="secondary" onClick={() => void navigate("/notes")}>
              К заметкам
            </Button>
          </div>
        </StateMessage>
      ) : (
        <GraphView
          graph={visible}
          coloring={coloring}
          className="min-h-[60vh] flex-1 overflow-hidden rounded-2xl border border-line bg-surface"
          onOpen={(node) =>
            node.missing
              ? createNote.mutate(
                  { folder: "", name: node.title },
                  {
                    onSuccess: (note) =>
                      void navigate(`/notes?path=${encodeURIComponent(note.path)}`),
                    onError: (error) => toast.error(error.message),
                  },
                )
              : void navigate(`/notes?path=${encodeURIComponent(node.id)}`)
          }
        />
      )}

      {coloring === "track" && (
        <ul aria-label="Цвета" className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
          {LEGEND.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
