import { describe, expect, it } from "vitest";
import {
  collectionAfterWatching,
  courseShare,
  lessonStatus,
  reachesCompletion,
  resumePosition,
  watchedSeconds,
} from "./progress";

const record = (positionSec: number, maxPositionSec = positionSec, completed = false) => ({
  positionSec,
  maxPositionSec,
  completed,
});

describe("reachesCompletion", () => {
  it("counts a video as watched from 90%", () => {
    expect(reachesCompletion(89, 100)).toBe(false);
    expect(reachesCompletion(90, 100)).toBe(true);
  });

  it("never completes a video without a known length", () => {
    expect(reachesCompletion(10, 0)).toBe(false);
  });
});

describe("lessonStatus", () => {
  it("is new without progress or after a few seconds", () => {
    expect(lessonStatus(undefined)).toBe("new");
    expect(lessonStatus(record(3))).toBe("new");
  });

  it("is partial once started and done once completed", () => {
    expect(lessonStatus(record(120))).toBe("partial");
    expect(lessonStatus(record(0, 950, true))).toBe("done");
  });
});

describe("watchedSeconds", () => {
  it("uses the furthest point, capped at the length", () => {
    expect(watchedSeconds(record(10, 300), 1000)).toBe(300);
    expect(watchedSeconds(record(10, 5000), 1000)).toBe(1000);
  });

  it("counts a completed video fully", () => {
    expect(watchedSeconds(record(0, 900, true), 1000)).toBe(1000);
  });
});

describe("courseShare", () => {
  it("weights videos by length and ignores short intros", () => {
    const share = courseShare([
      { kind: "short", durationSec: 100, progress: record(100, 100, true) },
      { kind: "lecture", durationSec: 3000, progress: record(0, 3000, true) },
      { kind: "recitation", durationSec: 1000 },
    ]);
    expect(share).toBe(0.75);
  });

  it("is zero for a course without videos", () => {
    expect(courseShare([])).toBe(0);
  });
});

describe("resumePosition", () => {
  it("continues from the saved place", () => {
    expect(resumePosition(record(180.7), 3000)).toBe(180);
  });

  it("starts over when the video was played to the end", () => {
    expect(resumePosition(record(2995), 3000)).toBe(0);
    expect(resumePosition(undefined, 3000)).toBe(0);
  });
});

describe("collectionAfterWatching", () => {
  it("moves catalog and wishlist courses into active", () => {
    expect(collectionAfterWatching(null)).toBe("active");
    expect(collectionAfterWatching("wishlist")).toBe("active");
  });

  it("keeps finished, archived and active courses where they are", () => {
    expect(collectionAfterWatching("completed")).toBe("completed");
    expect(collectionAfterWatching("archived")).toBe("archived");
    expect(collectionAfterWatching("active")).toBe("active");
  });
});
