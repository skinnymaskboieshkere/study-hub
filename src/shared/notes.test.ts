import { describe, expect, it } from "vitest";
import {
  frontmatterTags,
  linkKey,
  noteName,
  parseNote,
  resolveLink,
  splitFrontmatter,
} from "./notes";

describe("splitFrontmatter", () => {
  it("separates YAML from the body and counts its lines", () => {
    const parts = splitFrontmatter("---\ntype: lecture\ntags: [cs]\n---\n# Тема\nтекст");
    expect(parts.frontmatter).toBe("type: lecture\ntags: [cs]");
    expect(parts.body).toBe("# Тема\nтекст");
    expect(parts.bodyLine).toBe(4);
  });

  it("leaves a note without frontmatter alone", () => {
    expect(splitFrontmatter("# Заголовок\n---\n")).toEqual({
      frontmatter: null,
      body: "# Заголовок\n---\n",
      bodyLine: 0,
    });
  });

  it("handles Windows line endings", () => {
    expect(splitFrontmatter("---\r\na: 1\r\n---\r\nтело").body).toBe("тело");
  });
});

describe("parseNote", () => {
  it("finds wikilinks with headings, aliases and embeds", () => {
    const note = parseNote(
      "См. [[Производная]] и [[Матанализ/Пределы#Определение|предел]].\n![[схема.png]]",
    );
    expect(note.links).toEqual([
      expect.objectContaining({ target: "Производная", heading: null, alias: null, embed: false }),
      expect.objectContaining({
        target: "Матанализ/Пределы",
        heading: "Определение",
        alias: "предел",
        line: 0,
      }),
      expect.objectContaining({ target: "схема.png", embed: true, line: 1 }),
    ]);
    expect(note.links[0]?.context).toBe(
      "См. [[Производная]] и [[Матанализ/Пределы#Определение|предел]].",
    );
  });

  it("finds tags, nested ones too, but not headings, numbers or anchors", () => {
    const note = parseNote("# Заголовок\nТема #матанализ/пределы и #CS50 #2026\nhttp://a.b/#якорь");
    expect(note.tags).toEqual(["матанализ/пределы", "cs50"]);
  });

  it("ignores links and tags in code and in math blocks", () => {
    const note = parseNote(
      "```python\n# [[не ссылка]] #нетег\n```\n`[[и это]]`\n$$\n#x\n$$\n[[Ссылка]] #тег",
    );
    expect(note.links.map((link) => link.target)).toEqual(["Ссылка"]);
    expect(note.tags).toEqual(["тег"]);
  });

  it("finds YouTube links and timecodes, not other links", () => {
    const note = parseNote(
      "Смотри [▶ 12:34](https://www.youtube.com/watch?v=UuIEbpQms8o&t=754s) и https://youtu.be/JP7ITIXGpHk\n[сайт](https://cs50.harvard.edu)",
    );
    expect(note.videoLinks.map(({ videoId, tSec, line }) => ({ videoId, tSec, line }))).toEqual([
      { videoId: "UuIEbpQms8o", tSec: 754, line: 0 },
      { videoId: "JP7ITIXGpHk", tSec: 0, line: 0 },
    ]);
  });

  it("collects headings with levels and real line numbers", () => {
    const note = parseNote("---\na: 1\n---\n# Один\n## Два ##\nтекст");
    expect(note.headings).toEqual([
      { level: 1, text: "Один", line: 3 },
      { level: 2, text: "Два", line: 4 },
    ]);
  });
});

describe("frontmatterTags", () => {
  it("reads a list or a comma string", () => {
    expect(frontmatterTags(["CS50", "#лекция"])).toEqual(["cs50", "лекция"]);
    expect(frontmatterTags("робот, зрение")).toEqual(["робот", "зрение"]);
    expect(frontmatterTags(42)).toEqual([]);
  });
});

describe("names", () => {
  it("drops folders and .md", () => {
    expect(noteName("Курсы/CS50x/Лекция 1.md")).toBe("Лекция 1");
    expect(linkKey("Курсы/Лекция 1")).toBe("лекция 1");
  });
});

describe("resolveLink", () => {
  const paths = [
    "Производная.md",
    "Матанализ/Пределы.md",
    "Матанализ/Производная.md",
    "Физика/Механика/Векторы.md",
  ];

  it("matches by name without case and without .md", () => {
    expect(resolveLink("пределы", paths)).toBe("Матанализ/Пределы.md");
    expect(resolveLink("Векторы.md", paths)).toBe("Физика/Механика/Векторы.md");
  });

  it("matches by path", () => {
    expect(resolveLink("Матанализ/Производная", paths)).toBe("Матанализ/Производная.md");
    expect(resolveLink("Механика/Векторы", paths)).toBe("Физика/Механика/Векторы.md");
  });

  it("prefers the linking note's folder, then the shortest path", () => {
    expect(resolveLink("Производная", paths, "Матанализ/Пределы.md")).toBe(
      "Матанализ/Производная.md",
    );
    expect(resolveLink("Производная", paths, "Физика/Механика/Векторы.md")).toBe("Производная.md");
  });

  it("returns null for a missing note", () => {
    expect(resolveLink("Интегралы", paths)).toBeNull();
    expect(resolveLink("  ", paths)).toBeNull();
  });
});
