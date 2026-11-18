import { describe, expect, it } from "vitest";
import {
  applyTemplate,
  clock,
  defaultDailyNote,
  defaultLectureNote,
  fillTemplate,
  lectureNotePath,
  parseYoutubeLink,
  safeFileName,
  timecodeInsertion,
  timecodeMarkdown,
} from "./note-templates";

describe("parseYoutubeLink", () => {
  it("reads watch, short and embed links with their time", () => {
    expect(parseYoutubeLink("https://www.youtube.com/watch?v=UuIEbpQms8o&t=754s")).toEqual({
      videoId: "UuIEbpQms8o",
      tSec: 754,
    });
    expect(parseYoutubeLink("https://youtu.be/UuIEbpQms8o?t=1h2m3s")).toEqual({
      videoId: "UuIEbpQms8o",
      tSec: 3723,
    });
    expect(parseYoutubeLink("https://www.youtube-nocookie.com/embed/UuIEbpQms8o?start=90")).toEqual(
      {
        videoId: "UuIEbpQms8o",
        tSec: 90,
      },
    );
    expect(parseYoutubeLink("https://m.youtube.com/watch?v=UuIEbpQms8o")?.tSec).toBe(0);
  });

  it("ignores other sites and broken ids", () => {
    expect(parseYoutubeLink("https://example.com/watch?v=UuIEbpQms8o")).toBeNull();
    expect(parseYoutubeLink("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYoutubeLink("javascript:alert(1)")).toBeNull();
    expect(parseYoutubeLink("не ссылка")).toBeNull();
  });
});

describe("timecodes", () => {
  it("formats the clock", () => {
    expect(clock(754)).toBe("12:34");
    expect(clock(3723)).toBe("1:02:03");
    expect(clock(-5)).toBe("0:00");
  });

  it("builds the link the hotkey inserts (SPEC §6.6)", () => {
    expect(timecodeMarkdown("UuIEbpQms8o", 754.8)).toBe(
      "[▶ 12:34](https://www.youtube.com/watch?v=UuIEbpQms8o&t=754s)",
    );
  });
});

describe("file names", () => {
  it("keeps Cyrillic, drops characters that break links", () => {
    expect(safeFileName("Лекция 1: Векторы? [часть #2]")).toBe("Лекция 1 Векторы часть 2");
    expect(safeFileName("  ...  ")).toBe("Без названия");
  });

  it("builds the lecture note path", () => {
    expect(lectureNotePath("CS50x", 3, "Лекция 2 — Arrays")).toBe(
      "Courses/CS50x/03 - Лекция 2 — Arrays.md",
    );
  });
});

describe("templates", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(
      applyTemplate("# {{title}} — {{ date }} {{unknown}}", { title: "Т", date: "2026-11-18" }),
    ).toBe("# Т — 2026-11-18 {{unknown}}");
  });

  it("has every lecture section and the frontmatter from SPEC", () => {
    const note = defaultLectureNote({
      title: "Лекция 0 — Scratch",
      course: "cs50x",
      courseTitle: "CS50x",
      video: "UuIEbpQms8o",
      url: "https://www.youtube.com/watch?v=UuIEbpQms8o",
      date: "2026-11-18",
      subject: "programming",
    });
    for (const line of [
      "type: lecture",
      "course: cs50x",
      "video: UuIEbpQms8o",
      "status: in-progress",
    ]) {
      expect(note).toContain(line);
    }
    for (const section of [
      "Главные идеи",
      "Таймкоды",
      "Формулы",
      "Непонятно",
      "Связи",
      "Где пригодится",
    ]) {
      expect(note).toContain(`## ${section}`);
    }
  });

  it("puts the day's plan into the daily note as tasks", () => {
    const note = defaultDailyNote({
      date: "2026-11-18",
      title: "Среда, 18 ноября 2026",
      plan: ["CS50x · Лекция 0 (0:12–30:12)"],
    });
    expect(note).toContain("- [ ] CS50x · Лекция 0 (0:12–30:12)");
    expect(note).toContain("date: 2026-11-18");
  });
});

describe("fillTemplate", () => {
  it("puts the local date, time and the note title", () => {
    expect(
      fillTemplate("{{title}}: {{date}} {{time}}", "Пределы", new Date(2026, 10, 18, 9, 5)),
    ).toBe("Пределы: 2026-11-18 09:05");
  });
});

describe("timecodeInsertion", () => {
  const link = "[▶ 1:00](https://www.youtube.com/watch?v=UuIEbpQms8o&t=60s)";
  const note =
    "---\nvideo: UuIEbpQms8o\n---\n# Лекция\n\n## Таймкоды\n\n- [▶ 0:30](x)\n\n## Формулы\n";
  const apply = (doc: string, at: { from: number; insert: string }) =>
    doc.slice(0, at.from) + at.insert + doc.slice(at.from);

  it("uses a cursor the student placed in the text", () => {
    const cursor = note.indexOf("# Лекция") + 2;
    expect(timecodeInsertion(note, cursor, true, link)).toEqual({ from: cursor, insert: link });
  });

  it("never writes into the YAML properties: goes to the Таймкоды section instead", () => {
    const result = apply(note, timecodeInsertion(note, 0, false, link));
    expect(result).toContain(`- [▶ 0:30](x)\n- ${link}\n\n## Формулы`);
    expect(result.startsWith("---\nvideo:")).toBe(true);
    // Also when the cursor was put inside the properties.
    expect(apply(note, timecodeInsertion(note, 5, true, link))).toBe(result);
  });

  it("appends to the note when it has no Таймкоды section", () => {
    expect(apply("# Заметка", timecodeInsertion("# Заметка", 0, false, link))).toBe(
      `# Заметка\n- ${link}\n`,
    );
  });
});
