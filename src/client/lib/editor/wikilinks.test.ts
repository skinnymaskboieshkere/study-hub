import { describe, expect, it } from "vitest";
import { linkAt, urlAt } from "./wikilinks";

describe("links under the cursor", () => {
  const line =
    "См. [[Пределы#Определение|предел]] и [▶ 12:34](https://www.youtube.com/watch?v=UuIEbpQms8o&t=754s) или https://youtu.be/JP7ITIXGpHk.";

  it("finds the wikilink with its heading", () => {
    expect(linkAt(line, 8)).toEqual({ target: "Пределы", heading: "Определение" });
    expect(linkAt(line, 0)).toBeNull();
  });

  it("finds the address of a Markdown link from its label and its url", () => {
    const label = line.indexOf("▶");
    expect(urlAt(line, label)).toBe("https://www.youtube.com/watch?v=UuIEbpQms8o&t=754s");
    expect(urlAt(line, line.indexOf("t=754s"))).toBe(
      "https://www.youtube.com/watch?v=UuIEbpQms8o&t=754s",
    );
  });

  it("finds a bare address and nothing in plain text", () => {
    expect(urlAt(line, line.indexOf("youtu.be"))).toBe("https://youtu.be/JP7ITIXGpHk.");
    expect(urlAt(line, 2)).toBeNull();
  });
});
