import { describe, expect, it } from "vitest";
import { iso8601ToSeconds } from "./duration";

describe("iso8601ToSeconds", () => {
  it.each([
    ["PT45S", 45],
    ["PT12M34S", 754],
    ["PT1H", 3600],
    ["PT1H2M3S", 3723],
    ["PT2H", 7200],
    ["P1DT2H", 93_600],
    ["P0D", 0],
    ["PT0S", 0],
    ["PT1M30.6S", 91],
  ])("%s → %i", (input, expected) => {
    expect(iso8601ToSeconds(input)).toBe(expected);
  });

  it.each(["", "P", "PT", "1:02:03", "PT1X", "garbage"])("rejects %j", (input) => {
    expect(iso8601ToSeconds(input)).toBeNull();
  });
});
