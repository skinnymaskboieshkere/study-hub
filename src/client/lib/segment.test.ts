import { describe, expect, it } from "vitest";
import { parseSegment, reachedSegmentEnd, segmentShare, segmentStart } from "./segment";

const params = (query: string) => new URLSearchParams(query);

describe("parseSegment", () => {
  it("reads a part from the watch URL", () => {
    expect(parseSegment(params("course=cs50x&from=2700&to=5400&item=12"))).toEqual({
      itemId: 12,
      fromSec: 2700,
      toSec: 5400,
    });
  });

  it("ignores a URL without a part", () => {
    expect(parseSegment(params("course=cs50x"))).toBeNull();
    expect(parseSegment(params("from=0&to=600"))).toBeNull();
    expect(parseSegment(params("from=&to=600&item=1"))).toBeNull();
  });

  it("ignores broken numbers", () => {
    expect(parseSegment(params("from=600&to=600&item=1"))).toBeNull();
    expect(parseSegment(params("from=-5&to=600&item=1"))).toBeNull();
    expect(parseSegment(params("from=0&to=abc&item=1"))).toBeNull();
    expect(parseSegment(params("from=0&to=600&item=1.5"))).toBeNull();
    expect(parseSegment(params("from=0&to=600&item=0"))).toBeNull();
  });
});

describe("segmentStart", () => {
  const segment = { itemId: 1, fromSec: 2700, toSec: 5400 };

  it("starts at the beginning of the part", () => {
    expect(segmentStart(segment, 0)).toBe(2700);
    expect(segmentStart(segment, 2700)).toBe(2700);
  });

  it("continues from the saved place inside the part", () => {
    expect(segmentStart(segment, 3000)).toBe(3000);
  });

  it("starts over when the saved place is at the very end or past it", () => {
    expect(segmentStart(segment, 5390)).toBe(2700);
    expect(segmentStart(segment, 6000)).toBe(2700);
  });
});

describe("reachedSegmentEnd", () => {
  it("fires when playback crosses the end", () => {
    expect(reachedSegmentEnd(5399.6, 5400.1, 5400)).toBe(true);
    expect(reachedSegmentEnd(5398, 5401, 5400)).toBe(true);
  });

  it("does not fire before the end or after it was passed", () => {
    expect(reachedSegmentEnd(5300, 5300.5, 5400)).toBe(false);
    expect(reachedSegmentEnd(5401, 5401.5, 5400)).toBe(false);
  });

  it("does not fire on a jump over the end", () => {
    expect(reachedSegmentEnd(5395, 5405, 5400)).toBe(false);
    expect(reachedSegmentEnd(100, 6000, 5400)).toBe(false);
  });
});

describe("segmentShare", () => {
  const segment = { itemId: 1, fromSec: 600, toSec: 1200 };

  it("is the watched share of the part, kept within 0..1", () => {
    expect(segmentShare(segment, 900)).toBe(0.5);
    expect(segmentShare(segment, 0)).toBe(0);
    expect(segmentShare(segment, 5000)).toBe(1);
  });
});
