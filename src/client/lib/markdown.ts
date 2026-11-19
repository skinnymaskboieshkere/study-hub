import { splitFrontmatter, TAG, WIKILINK } from "@shared/notes";
import type { Root as HastRoot } from "hast";
import matlab from "highlight.js/lib/languages/matlab";
import { common } from "lowlight";
import type { PhrasingContent, Root, RootContent } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Obsidian syntax on top of Markdown: `[[Note#Heading|alias]]`, `![[embed]]` and `#tags` become
 * links the preview can handle. Code, math and existing links are left alone.
 */
function remarkObsidian() {
  return (tree: Root) => {
    findAndReplace(
      tree,
      [
        [
          new RegExp(WIKILINK.source, "g"),
          (_all: string, bang: string, target: string, heading?: string, alias?: string) => {
            const cleanTarget = (target ?? "").trim();
            const cleanHeading = heading?.trim() || "";
            const label =
              alias?.trim() ||
              (cleanHeading
                ? `${cleanTarget || ""} › ${cleanHeading}`.replace(/^ › /, "")
                : cleanTarget);
            return {
              type: "link",
              url: "#",
              children: [{ type: "text", value: label }],
              data: {
                hProperties: {
                  dataWikilink: cleanTarget,
                  dataHeading: cleanHeading,
                  dataEmbed: bang === "!" ? "true" : undefined,
                  dataAlias: alias?.trim() || undefined,
                },
              },
            } satisfies PhrasingContent;
          },
        ],
        [
          new RegExp(TAG.source, "gu"),
          (_all: string, before: string, tag: string): PhrasingContent[] => [
            ...(before ? [{ type: "text", value: before } satisfies PhrasingContent] : []),
            {
              type: "link",
              url: "#",
              children: [{ type: "text", value: `#${tag}` }],
              data: { hProperties: { dataTag: tag } },
            },
          ],
        ],
      ],
      { ignore: ["link", "linkReference", "inlineCode", "code", "inlineMath", "math"] },
    );
    blockEmbeds(tree);
  };
}

const isEmbed = (node: RootContent) =>
  node.type === "link" &&
  (node.data?.hProperties as Record<string, unknown> | undefined)?.dataEmbed === "true";

/**
 * A paragraph that holds only `![[...]]` embeds becomes a block (`<div>`): an embedded note brings
 * its own paragraphs and headings, which may not sit inside a `<p>`.
 */
function blockEmbeds(node: Root | RootContent) {
  if (!("children" in node)) return;
  for (const child of node.children) {
    if (
      child.type === "paragraph" &&
      child.children.some(isEmbed) &&
      child.children.every((part) => isEmbed(part) || (part.type === "text" && !part.value.trim()))
    ) {
      child.data = { ...child.data, hName: "div", hProperties: { className: ["md-embeds"] } };
    } else {
      blockEmbeds(child);
    }
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkObsidian)
  .use(remarkRehype)
  // Errors in a formula are shown in red inside the note instead of breaking the preview.
  .use(rehypeKatex, { throwOnError: false, strict: false })
  // Languages from SPEC §6.5: C, Python, SQL, JS (all in `common`) and MATLAB.
  .use(rehypeHighlight, { languages: { ...common, matlab }, detect: false });

/** Note text → HTML tree for the preview; the frontmatter is returned separately. */
export function renderMarkdown(text: string): { frontmatter: string | null; tree: HastRoot } {
  const { frontmatter, body } = splitFrontmatter(text);
  const tree = processor.runSync(processor.parse(body)) as HastRoot;
  return { frontmatter, tree };
}
