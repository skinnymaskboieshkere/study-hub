import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

function elements(node: Root | Element, found: Element[] = []): Element[] {
  for (const child of node.children) {
    if (child.type === "element") {
      found.push(child);
      elements(child, found);
    }
  }
  return found;
}

const links = (text: string) =>
  elements(renderMarkdown(text).tree).filter((node) => node.tagName === "a");

describe("renderMarkdown", () => {
  it("turns wikilinks into links with target, heading and alias", () => {
    const [link] = links("См. [[Матанализ/Пределы#Определение|предел]].");
    expect(link?.properties).toMatchObject({
      dataWikilink: "Матанализ/Пределы",
      dataHeading: "Определение",
    });
    expect(link?.children).toEqual([{ type: "text", value: "предел" }]);
  });

  it("shows the heading when there is no alias", () => {
    const [link] = links("[[Пределы#Определение]]");
    expect(link?.children).toEqual([{ type: "text", value: "Пределы › Определение" }]);
  });

  it("marks tags but not code", () => {
    const found = links("Тема #матанализ/пределы и `#нетег`");
    expect(found.map((link) => link.properties.dataTag)).toEqual(["матанализ/пределы"]);
  });

  it("renders formulas with KaTeX", () => {
    const tree = renderMarkdown("Формула $e^{i\\pi} + 1 = 0$\n\n$$\n\\int_0^1 x\\,dx\n$$");
    const classes = elements(tree.tree).flatMap((node) => [node.properties.className].flat());
    expect(classes).toContain("katex");
    expect(classes).toContain("katex-display");
  });

  it("highlights code, MATLAB included", () => {
    const tree = renderMarkdown("```matlab\nx = linspace(0, 1, 10);\n```");
    const code = elements(tree.tree).find((node) => node.tagName === "code");
    expect(code?.properties.className).toContain("language-matlab");
    expect(
      elements(tree.tree).some((node) => String(node.properties.className).includes("hljs-")),
    ).toBe(true);
  });

  it("keeps the frontmatter out of the body", () => {
    const result = renderMarkdown("---\ntype: lecture\n---\n# Тема");
    expect(result.frontmatter).toBe("type: lecture");
    expect(elements(result.tree)[0]?.tagName).toBe("h1");
  });

  it("drops raw HTML", () => {
    const tree = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(
      elements(tree.tree).some((node) => node.tagName === "script" || node.tagName === "img"),
    ).toBe(false);
  });
});
