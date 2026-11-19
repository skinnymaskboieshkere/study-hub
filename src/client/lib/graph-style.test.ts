import type { GraphData } from "@shared/note-links";
import { describe, expect, it } from "vitest";
import { filterGraph, MISSING_COLOR, nodeColor, NOTE_COLOR, tagColor } from "./graph-style";

const node = (id: string, extra: Partial<GraphData["nodes"][number]> = {}) => ({
  id,
  title: id.replace(/\.md$/, ""),
  tags: [],
  track: null,
  missing: false,
  degree: 1,
  ...extra,
});

const graph: GraphData = {
  nodes: [
    node("Производная.md", { tags: ["матанализ/производные"], track: "foundation" }),
    node("Пределы.md", { tags: ["матанализ"] }),
    node("Одинокая.md", { degree: 0 }),
    node("missing:интеграл", { title: "Интеграл", missing: true }),
  ],
  links: [
    { source: "Производная.md", target: "Пределы.md" },
    { source: "Пределы.md", target: "missing:интеграл" },
  ],
};

const all = { query: "", tag: "", showMissing: true, showOrphans: true };

describe("graph colors", () => {
  it("colors by track, by first tag, and fades missing notes", () => {
    expect(nodeColor(graph.nodes[0]!, "track")).toBe("#a78bfa");
    expect(nodeColor(graph.nodes[1]!, "track")).toBe(NOTE_COLOR);
    expect(nodeColor(graph.nodes[0]!, "tag")).toBe(tagColor("матанализ"));
    expect(nodeColor(graph.nodes[3]!, "tag")).toBe(MISSING_COLOR);
  });
});

describe("filterGraph", () => {
  it("hides missing notes and orphans on request", () => {
    const result = filterGraph(graph, { ...all, showMissing: false, showOrphans: false });
    expect(result.nodes.map((item) => item.id)).toEqual(["Производная.md", "Пределы.md"]);
    expect(result.links).toEqual([{ source: "Производная.md", target: "Пределы.md" }]);
  });

  it("keeps notes with a tag, nested tags included, and by name", () => {
    expect(filterGraph(graph, { ...all, tag: "матанализ" }).nodes.map((item) => item.id)).toEqual([
      "Производная.md",
      "Пределы.md",
    ]);
    expect(filterGraph(graph, { ...all, query: "пред" }).nodes.map((item) => item.id)).toEqual([
      "Пределы.md",
    ]);
  });
});
