import { describe, expect, it } from "vitest";
import { formatDayTitle, isWholeVideo, watchUrlForItem } from "./plan";

describe("watchUrlForItem", () => {
  it("opens the player on the planned part", () => {
    expect(
      watchUrlForItem({
        id: 7,
        youtubeId: "J7DzL2_Na80",
        courseSlug: "mit-18-06",
        startSec: 0,
        endSec: 2700,
      }),
    ).toBe("/watch/J7DzL2_Na80?course=mit-18-06&from=0&to=2700&item=7");
  });
});

describe("formatDayTitle", () => {
  it("names the day in Russian with a capital letter", () => {
    expect(formatDayTitle("2026-11-18")).toBe("Среда, 18 ноября");
  });
});

describe("isWholeVideo", () => {
  it("tells a whole video from a part", () => {
    expect(isWholeVideo({ startSec: 0, endSec: 600, videoDurationSec: 600 })).toBe(true);
    expect(isWholeVideo({ startSec: 0, endSec: 300, videoDurationSec: 600 })).toBe(false);
    expect(isWholeVideo({ startSec: 300, endSec: 600, videoDurationSec: 600 })).toBe(false);
  });
});
