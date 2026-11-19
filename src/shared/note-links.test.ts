import { describe, expect, it } from "vitest";
import { buildGraph, linkTextFor, neighborhood, rewriteLinks } from "./note-links";

describe("linkTextFor", () => {
  it("uses the name, or the path when another note has the same name", () => {
    expect(linkTextFor("Матанализ/Пределы.md", ["Матанализ/Пределы.md", "Входящие.md"])).toBe(
      "Пределы",
    );
    expect(linkTextFor("Физика/Векторы.md", ["Физика/Векторы.md", "Векторы.md"])).toBe(
      "Физика/Векторы",
    );
  });
});

describe("rewriteLinks", () => {
  const before = ["Матанализ/Производная.md", "Матанализ/Пределы.md", "Входящие.md"];
  const after = ["Матанализ/Производная по определению.md", "Матанализ/Пределы.md", "Входящие.md"];
  const rename = (content: string, sourceBefore = "Входящие.md") =>
    rewriteLinks(content, {
      sourceBefore,
      oldPath: "Матанализ/Производная.md",
      newPath: "Матанализ/Производная по определению.md",
      pathsBefore: before,
      pathsAfter: after,
    });

  it("moves plain links, links with heading or alias, embeds; any case", () => {
    const result = rename(
      "См. [[Производная]], [[производная#Правила|правила]] и ![[Матанализ/Производная]]. [[Пределы]] не трогать.",
    );
    expect(result.content).toBe(
      "См. [[Производная по определению]], [[Производная по определению#Правила|правила]] и ![[Производная по определению]]. [[Пределы]] не трогать.",
    );
    expect(result.count).toBe(3);
  });

  it("leaves code blocks and inline code alone", () => {
    const text = "```md\n[[Производная]]\n```\n`[[Производная]]` и [[Производная]]";
    expect(rename(text)).toEqual({
      content: "```md\n[[Производная]]\n```\n`[[Производная]]` и [[Производная по определению]]",
      count: 1,
    });
  });

  it("keeps Windows line endings and counts nothing in unrelated notes", () => {
    expect(rename("[[Пределы]]\r\nтекст\r\n")).toEqual({
      content: "[[Пределы]]\r\nтекст\r\n",
      count: 0,
    });
  });
});

describe("graph", () => {
  const graph = buildGraph([
    { path: "A.md", targets: ["B", "b", "Нет такой"], tags: ["x"], track: "foundation" },
    { path: "B.md", targets: ["C"], tags: [], track: null },
    { path: "C.md", targets: [], tags: [], track: null },
    { path: "D.md", targets: [], tags: [], track: null },
  ]);

  it("resolves links, merges duplicates and adds missing notes as faded nodes", () => {
    expect(graph.links).toEqual([
      { source: "A.md", target: "B.md" },
      { source: "A.md", target: "missing:нет такой" },
      { source: "B.md", target: "C.md" },
    ]);
    expect(graph.nodes.find((node) => node.id === "missing:нет такой")).toMatchObject({
      title: "Нет такой",
      missing: true,
    });
    expect(graph.nodes.find((node) => node.id === "B.md")?.degree).toBe(2);
  });

  it("cuts a local graph around a note", () => {
    expect(neighborhood(graph, "C.md").nodes.map((node) => node.id)).toEqual(["B.md", "C.md"]);
    expect(
      neighborhood(graph, "C.md", 2)
        .nodes.map((node) => node.id)
        .sort(),
    ).toEqual(["A.md", "B.md", "C.md"]);
  });
});
