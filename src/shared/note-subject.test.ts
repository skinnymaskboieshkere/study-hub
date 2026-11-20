import { describe, expect, it } from "vitest";
import type { Subject } from "./catalog";
import { noteSubject, subjectFromWord } from "./note-subject";

const lookup = {
  courseSubject: new Map<string, Subject>([
    ["mit-18-06", "math"],
    ["cs50x", "programming"],
  ]),
  videoCourse: new Map([["J7DzL2_Na80", "mit-18-06"]]),
};

describe("subjectFromWord", () => {
  it("knows keys, Russian names and tags in any case", () => {
    expect(subjectFromWord("math")).toBe("math");
    expect(subjectFromWord("Математика")).toBe("math");
    expect(subjectFromWord("#Physics")).toBe("physics");
    expect(subjectFromWord("Компьютерное  зрение")).toBe("cv");
    expect(subjectFromWord("история")).toBeNull();
    expect(subjectFromWord(42)).toBeNull();
  });
});

describe("noteSubject", () => {
  it("prefers subject: in the frontmatter", () => {
    expect(noteSubject({ subject: "Физика", course: "cs50x" }, [], lookup)).toBe("physics");
  });

  it("takes the course of a lecture note", () => {
    expect(noteSubject({ course: "cs50x" }, [], lookup)).toBe("programming");
  });

  it("finds the course by the video id or a YouTube link", () => {
    expect(noteSubject({ video: "J7DzL2_Na80" }, [], lookup)).toBe("math");
    expect(
      noteSubject({ video: "https://www.youtube.com/watch?v=J7DzL2_Na80&t=60s" }, [], lookup),
    ).toBe("math");
  });

  it("falls back to a subject tag, then to nothing", () => {
    expect(noteSubject({ tags: ["lecture", "robotics"] }, [], lookup)).toBe("robotics");
    expect(noteSubject(null, ["идея", "математика"], lookup)).toBe("math");
    expect(noteSubject({ course: "unknown" }, ["идея"], lookup)).toBeNull();
  });
});
