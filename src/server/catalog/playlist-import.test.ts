import { describe, expect, it } from "vitest";
import {
  interleaveProportionally,
  isTrailer,
  lectureTitle,
  lectureTopic,
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

describe("lectureTopic", () => {
  it("drops the number and the course name, wherever they stand", () => {
    const cases: [string, string][] = [
      ["Lec 1: Dot product | MIT 18.02 Multivariable Calculus, Fall 2007", "Dot product"],
      ["Lec 1 | MIT 18.03 Differential Equations, Spring 2006", ""],
      ["Lecture 1, Introduction | MIT RES.6.007 Signals and Systems, Spring 2011", "Introduction"],
      ["Lecture 4: Conditional Probability | Statistics 110", "Conditional Probability"],
      [
        "Stanford CS231N | Spring 2025 | Lecture 2: Image Classification with Linear Classifiers",
        "Image Classification with Linear Classifiers",
      ],
      ["1. Electrostatics", "Electrostatics"],
      [
        "6.4210 Fall 2023 Lecture 9: Manipulation in Clutter- Grasp Selection",
        "Manipulation in Clutter- Grasp Selection",
      ],
      [
        "Lecture 3 | MIT 6.832 (Underactuated Robotics), Spring 2020 | Dynamic Programming",
        "Dynamic Programming",
      ],
      ["Lecture 1 | Introduction to Robotics", ""],
      ["Linear Systems [Control Bootcamp]", "Linear Systems [Control Bootcamp]"],
    ];
    for (const [title, topic] of cases) expect(lectureTopic(title)).toBe(topic);
  });

  it("builds the Russian lecture title", () => {
    expect(lectureTitle("Lec 3: Matrices | MIT 18.02", 9)).toBe("Лекция 3 — Matrices");
    expect(lectureTitle("Lec 2 | MIT 18.03", 9)).toBe("Лекция 2");
    expect(lectureTitle("Overview", 4)).toBe("Лекция 4 — Overview");
  });
});
