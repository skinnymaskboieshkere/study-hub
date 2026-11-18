import { describe, expect, it } from "vitest";
import { formatDuration, formatPercent, formatTimecode, pluralRu } from "./format";

describe("formatPercent", () => {
  it("rounds down and never shows a started course as 0%", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.004)).toBe("<1%");
    expect(formatPercent(0.379)).toBe("37%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(Number.NaN)).toBe("0%");
  });
});

describe("formatTimecode", () => {
  it("formats minutes and seconds", () => {
    expect(formatTimecode(0)).toBe("0:00");
    expect(formatTimecode(5)).toBe("0:05");
    expect(formatTimecode(754)).toBe("12:34");
  });

  it("adds hours for long videos", () => {
    expect(formatTimecode(3600)).toBe("1:00:00");
    expect(formatTimecode(4325)).toBe("1:12:05");
  });

  it("drops fractions and survives bad input", () => {
    expect(formatTimecode(61.9)).toBe("1:01");
    expect(formatTimecode(-10)).toBe("0:00");
    expect(formatTimecode(Number.NaN)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  it("uses minutes below an hour", () => {
    expect(formatDuration(0)).toBe("0 мин");
    expect(formatDuration(2700)).toBe("45 мин");
  });

  it("uses hours and minutes from an hour up", () => {
    expect(formatDuration(3600)).toBe("1 ч");
    expect(formatDuration(8100)).toBe("2 ч 15 мин");
  });

  it("rounds to whole minutes", () => {
    expect(formatDuration(89)).toBe("1 мин");
    expect(formatDuration(3599)).toBe("1 ч");
  });
});

describe("pluralRu", () => {
  const forms: [string, string, string] = ["лекция", "лекции", "лекций"];

  it.each([
    [1, "лекция"],
    [2, "лекции"],
    [4, "лекции"],
    [5, "лекций"],
    [11, "лекций"],
    [12, "лекций"],
    [14, "лекций"],
    [21, "лекция"],
    [22, "лекции"],
    [111, "лекций"],
    [0, "лекций"],
  ])("%i → %s", (count, expected) => {
    expect(pluralRu(count, forms)).toBe(expected);
  });
});
