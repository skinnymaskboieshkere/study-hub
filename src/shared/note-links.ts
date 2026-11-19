/**
 * Renaming notes and the graph of links (SPEC §6.5, §9.3). Pure functions: the server applies
 * them to files, the client draws the graph.
 */
import { noteName, resolveLink, WIKILINK } from "./notes";

/** The link text Obsidian writes for a note: its name, or its path when the name is taken. */
export function linkTextFor(path: string, paths: readonly string[]): string {
  const name = noteName(path).toLowerCase();
  const same = paths.filter((other) => noteName(other).toLowerCase() === name);
  return same.length > 1 ? path.replace(/\.md$/i, "") : noteName(path);
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

export interface RenameInput {
  /** The note being changed, as it was named before the rename. */
  sourceBefore: string;
  oldPath: string;
  newPath: string;
  pathsBefore: readonly string[];
  pathsAfter: readonly string[];
}

/**
 * Points every `[[link]]` and `![[embed]]` that led to `oldPath` at `newPath`; heading and alias
 * stay, code blocks and inline code are left alone. Returns the new text and how many links moved.
 */
export function rewriteLinks(
  content: string,
  input: RenameInput,
): { content: string; count: number } {
  const target = linkTextFor(input.newPath, input.pathsAfter);
  let count = 0;
  let fence: string | null = null;

  const rewrite = (text: string) =>
    text.replace(
      new RegExp(WIKILINK.source, "g"),
      (all, bang: string, linkTarget: string, heading?: string, alias?: string) => {
        if (!linkTarget.trim()) return all;
        const resolved = resolveLink(linkTarget, input.pathsBefore, input.sourceBefore);
        if (resolved !== input.oldPath) return all;
        const next = `${bang}[[${target}${heading !== undefined ? `#${heading}` : ""}${alias !== undefined ? `|${alias}` : ""}]]`;
        // A move to another folder often keeps the same text: then nothing changes.
        if (next !== all) count += 1;
        return next;
      },
    );

  const lines = content.split(/(\r?\n)/);
  for (let index = 0; index < lines.length; index += 2) {
    const line = lines[index] ?? "";
    const fenceMatch = FENCE.exec(line);
    if (fence) {
      if (fenceMatch?.[1]?.[0] === fence[0] && (fenceMatch[1]?.length ?? 0) >= fence.length)
        fence = null;
      continue;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      continue;
    }
    // Odd pieces are inline code spans: kept as they are.
    lines[index] = line
      .split(/(`[^`]*`)/)
      .map((piece, part) => (part % 2 === 1 ? piece : rewrite(piece)))
      .join("");
  }
  return { content: lines.join(""), count };
}

export interface GraphSource {
  path: string;
  /** Raw link targets as written, embeds included. */
  targets: string[];
  tags: string[];
  /** Track of the course for lecture notes (frontmatter `course:`), for colors. */
  track: string | null;
}

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  track: string | null;
  /** A link target with no note yet (Obsidian draws it faded). */
  missing: boolean;
  /** Number of links in and out: the node size. */
  degree: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: { source: string; target: string }[];
}

/** Notes as nodes and their resolved links as edges; one edge per pair and direction. */
export function buildGraph(sources: readonly GraphSource[]): GraphData {
  const paths = sources.map((source) => source.path);
  const nodes = new Map<string, GraphNode>(
    sources.map((source) => [
      source.path,
      {
        id: source.path,
        title: noteName(source.path),
        tags: source.tags,
        track: source.track,
        missing: false,
        degree: 0,
      },
    ]),
  );
  const seen = new Set<string>();
  const links: GraphData["links"] = [];

  for (const source of sources) {
    for (const raw of source.targets) {
      const resolved = resolveLink(raw, paths, source.path);
      const target = resolved ?? `missing:${noteName(raw).toLowerCase()}`;
      if (target === source.path) continue;
      if (!resolved && !nodes.has(target)) {
        nodes.set(target, {
          id: target,
          title: noteName(raw),
          tags: [],
          track: null,
          missing: true,
          degree: 0,
        });
      }
      const key = `${source.path}→${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: source.path, target });
      nodes.get(source.path)!.degree += 1;
      nodes.get(target)!.degree += 1;
    }
  }
  return { nodes: [...nodes.values()], links };
}

/** The local graph: the note and everything within `depth` links, either direction. */
export function neighborhood(graph: GraphData, center: string, depth = 1): GraphData {
  const keep = new Set([center]);
  let frontier = new Set([center]);
  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const link of graph.links) {
      if (frontier.has(link.source) && !keep.has(link.target)) next.add(link.target);
      if (frontier.has(link.target) && !keep.has(link.source)) next.add(link.source);
    }
    for (const id of next) keep.add(id);
    frontier = next;
  }
  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    links: graph.links.filter((link) => keep.has(link.source) && keep.has(link.target)),
  };
}
