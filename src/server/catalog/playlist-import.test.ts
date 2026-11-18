import { describe, expect, it } from "vitest";
import {
  interleaveProportionally,
  isTrailer,
  numberFromTitle,
  toSeedVideo,
  unitsFromLecturePlaylist,
} from "./playlist-import";

describe("numberFromTitle", () => {
  it.each([
    ["CS50x - Lecture 3 - Algorithms", 3],
    ["CS50x 2026 - Section 4 - Memory", 4],
    ["Lec 12 | MIT 18.01 Single Variable Calculus, Fall 2007", 12],
    ["7. Solving Ax = 0: Pivot Variables, Special Solutions", 7],
    ["Курс CS50 2025 на русском языке - Лекция 0 - Scratch", 0],
    ["Основы программирования. Лекция №2. Массивы.", 2],
  ])("%s → %i", (title, expected) => {
    expect(numberFromTitle(title)).toBe(expected);
  });

  it("returns undefined when the title has no number", () => {
    expect(numberFromTitle("Geometry of Linear Algebra")).toBeUndefined();
    expect(numberFromTitle("CS50x - Artificial Intelligence")).toBeUndefined();
  });
});

describe("interleaveProportionally", () => {
  it("spreads extras evenly and keeps their order", () => {
    expect(interleaveProportionally(["L1", "L2", "L3"], ["a", "b", "c", "d", "e", "f"])).toEqual([
      { item: "L1", extras: ["a", "b"] },
      { item: "L2", extras: ["c", "d"] },
      { item: "L3", extras: ["e", "f"] },
    ]);
  });

  it("never loses or repeats extras when they do not divide evenly", () => {
    const result = interleaveProportionally(["L1", "L2", "L3"], [1, 2, 3, 4]);
    expect(result.flatMap((r) => r.extras)).toEqual([1, 2, 3, 4]);
  });

  it("works with no extras", () => {
    expect(interleaveProportionally(["L1"], [])).toEqual([{ item: "L1", extras: [] }]);
  });
});

describe("isTrailer", () => {
  it("spots trailers in English and Russian", () => {
    expect(isTrailer("CS50 2026 Trailer")).toBe(true);
    expect(isTrailer("Трейлер курса")).toBe(true);
    expect(isTrailer("Lecture 1 — Traits of matrices")).toBe(false);
  });
});

describe("unitsFromLecturePlaylist", () => {
  const video = {
    youtubeId: "aaaaaaaaaaa",
    title: "Lec 3 | Something",
    durationSec: 60,
    embeddable: true,
  };

  it("numbers lectures by their titles, falling back to the position", () => {
    const [unit] = unitsFromLecturePlaylist([
      video,
      { ...video, youtubeId: "bbbbbbbbbbb", title: "Bonus talk" },
    ]);
    expect(unit?.videos.map((v) => v.title)).toEqual([
      "Лекция 3 — Lec 3 | Something",
      "Лекция 2 — Bonus talk",
    ]);
  });

  it("returns no units for an empty playlist", () => {
    expect(unitsFromLecturePlaylist([])).toEqual([]);
  });
});

describe("toSeedVideo", () => {
  it("marks translations with their language and the original video", () => {
    const seed = toSeedVideo(
      { youtubeId: "ruruRURU123", title: "x", durationSec: 100, embeddable: true },
      "lecture",
      "Лекция 0 — Scratch",
      { language: "ru", originalYoutubeId: "UuIEbpQms8o" },
    );
    expect(seed).toEqual({
      youtubeId: "ruruRURU123",
      title: "Лекция 0 — Scratch",
      durationSec: 100,
      kind: "lecture",
      language: "ru",
      originalYoutubeId: "UuIEbpQms8o",
      embeddable: true,
    });
  });
});
