import type { GraphData, GraphNode } from "@shared/note-links";

/** Track colors from the theme (styles/index.css): the same on every screen (SPEC §7). */
const TRACK_COLORS: Record<string, string> = {
  foundation: "#a78bfa",
  engineering: "#60a5fa",
  robotics: "#34d399",
  cv: "#22d3ee",
};

const TAG_COLORS = [
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#60a5fa",
  "#34d399",
  "#22d3ee",
  "#fbbf24",
  "#e879f9",
];

export const NOTE_COLOR = "#8f8aa8";
export const MISSING_COLOR = "#4b4560";

export type GraphColoring = "track" | "tag";

/** Same tag → same color, every time. */
export function tagColor(tag: string): string {
  let hash = 0;
  for (const char of tag) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length]!;
}

/** Node color "by track" (lecture notes of a course) or "by tag" (the first tag), SPEC §6.5. */
export function nodeColor(node: GraphNode, coloring: GraphColoring): string {
  if (node.missing) return MISSING_COLOR;
  if (coloring === "track")
    return node.track ? (TRACK_COLORS[node.track] ?? NOTE_COLOR) : NOTE_COLOR;
  const tag = [...node.tags].sort()[0];
  return tag ? tagColor(tag.split("/")[0]!) : NOTE_COLOR;
}

export interface GraphFilters {
  /** Part of a note name. */
  query: string;
  /** Only notes with this tag (nested ones too). */
  tag: string;
  /** Links to notes that do not exist yet. */
  showMissing: boolean;
  /** Notes without any link. */
  showOrphans: boolean;
}

/** The graph after the filters: notes that pass and the links between them. */
export function filterGraph(graph: GraphData, filters: GraphFilters): GraphData {
  const query = filters.query.trim().toLowerCase();
  const tag = filters.tag.toLowerCase();
  const keep = new Set(
    graph.nodes
      .filter((node) => filters.showMissing || !node.missing)
      .filter((node) => filters.showOrphans || node.degree > 0)
      .filter((node) => !query || node.title.toLowerCase().includes(query))
      .filter(
        (node) => !tag || node.tags.some((item) => item === tag || item.startsWith(`${tag}/`)),
      )
      .map((node) => node.id),
  );
  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    links: graph.links.filter((link) => keep.has(link.source) && keep.has(link.target)),
  };
}
