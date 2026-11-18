import { describe, expect, it } from "vitest";
import { youtubeThumbnailUrl, youtubeWatchUrl } from "./youtube";

describe("youtubeWatchUrl", () => {
  it("builds the timecode link format from SPEC §6.6", () => {
    expect(youtubeWatchUrl("abc123DEF45", 754)).toBe(
      "https://www.youtube.com/watch?v=abc123DEF45&t=754s",
    );
  });

  it("leaves out the start time when it is zero or missing", () => {
    expect(youtubeWatchUrl("abc123DEF45")).toBe("https://www.youtube.com/watch?v=abc123DEF45");
    expect(youtubeWatchUrl("abc123DEF45", 0)).toBe("https://www.youtube.com/watch?v=abc123DEF45");
  });

  it("drops fractions of a second", () => {
    expect(youtubeWatchUrl("abc123DEF45", 12.9)).toBe(
      "https://www.youtube.com/watch?v=abc123DEF45&t=12s",
    );
  });
});

describe("youtubeThumbnailUrl", () => {
  it("defaults to hqdefault, which every video has", () => {
    expect(youtubeThumbnailUrl("abc123DEF45")).toBe(
      "https://i.ytimg.com/vi/abc123DEF45/hqdefault.jpg",
    );
  });
});
