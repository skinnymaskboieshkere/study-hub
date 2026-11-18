import { describe, expect, it } from "vitest";
import { clampRate, playerErrorText } from "./player";

describe("clampRate", () => {
  it("keeps speeds between 0.5× and 2× in quarter steps", () => {
    expect(clampRate(1.25)).toBe(1.25);
    expect(clampRate(2.25)).toBe(2);
    expect(clampRate(0.25)).toBe(0.5);
    expect(clampRate(1.3)).toBe(1.25);
  });
});

describe("playerErrorText", () => {
  it("explains embedding bans and offers YouTube", () => {
    expect(playerErrorText(150).title).toBe("Это видео нельзя показать в приложении");
    expect(playerErrorText(101).text).toContain("101");
  });

  it("explains the missing Referer error", () => {
    expect(playerErrorText(153).text).toContain("127.0.0.1:5180");
  });

  it("has a fallback for unknown codes", () => {
    expect(playerErrorText(42).text).toContain("42");
  });
});
