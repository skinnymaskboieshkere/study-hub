import { describe, expect, it } from "vitest";
import type { NoteTreeNodeDto } from "@shared/api";
import {
  filterNotes,
  filterTreeBySubject,
  folderPaths,
  snippetParts,
  treeSubjects,
} from "./notes-filter";

const note = (path: string, mtimeMs = 0) => ({
  path,
  title: path.split("/").pop()!.replace(/\.md$/, ""),
  mtimeMs,
  subject: null,
});

const notes = [
  note("Матанализ/Пределы.md", 1),
  note("Матанализ/Производная.md", 2),
  note("Физика/Векторы и пределы.md", 3),
  note("Дневник.md", 4),
];

describe("filterNotes", () => {
  it("puts title starts before title matches before path matches", () => {
    expect(filterNotes(notes, "пред").map((item) => item.title)).toEqual([
      "Пределы",
      "Векторы и пределы",
    ]);
    expect(filterNotes(notes, "матанализ").map((item) => item.title)).toEqual([
      "Производная",
      "Пределы",
    ]);
  });

  it("accepts letters with gaps and ignores case", () => {
    expect(filterNotes(notes, "ПРЗВ").map((item) => item.title)).toEqual(["Производная"]);
  });

  it("shows the most recent notes for an empty query", () => {
    expect(filterNotes(notes, " ", 2).map((item) => item.title)).toEqual([
      "Дневник",
      "Векторы и пределы",
    ]);
  });
});

describe("snippetParts", () => {
  it("splits a snippet into found and plain pieces", () => {
    const open = String.fromCharCode(2);
    const close = String.fromCharCode(3);
    expect(snippetParts(`…это ${open}предел${close} функции`)).toEqual([
      { text: "…это ", hit: false },
      { text: "предел", hit: true },
      { text: " функции", hit: false },
    ]);
  });
});

describe("filterTreeBySubject", () => {
  const tree: NoteTreeNodeDto[] = [
    {
      name: "Курсы",
      path: "Курсы",
      type: "folder",
      children: [
        { name: "Пределы", path: "Курсы/Пределы.md", type: "note", subject: "math" },
        { name: "Волны", path: "Курсы/Волны.md", type: "note", subject: "physics" },
        { name: "Пусто", path: "Курсы/Пусто", type: "folder", children: [] },
      ],
    },
    { name: "C", path: "C.md", type: "note", subject: "programming" },
    { name: "Разное", path: "Разное.md", type: "note", subject: null },
  ];

  it("keeps everything without a filter", () => {
    expect(filterTreeBySubject(tree, [])).toBe(tree);
  });

  it("keeps matching notes and the folders on their way", () => {
    expect(filterTreeBySubject(tree, ["math", "programming"])).toEqual([
      {
        name: "Курсы",
        path: "Курсы",
        type: "folder",
        children: [{ name: "Пределы", path: "Курсы/Пределы.md", type: "note", subject: "math" }],
      },
      { name: "C", path: "C.md", type: "note", subject: "programming" },
    ]);
    expect(filterTreeBySubject(tree, ["cv"])).toEqual([]);
  });

  it("lists the subjects the notes have, in the catalog order", () => {
    expect(treeSubjects(tree)).toEqual(["programming", "math", "physics"]);
    expect(folderPaths(tree)).toEqual(["Курсы", "Курсы/Пусто"]);
  });
});
