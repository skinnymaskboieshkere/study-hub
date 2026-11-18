/**
 * Obsidian-style Markdown rules shared by the server index and the client (SPEC §6.5, §9.3):
 * wikilinks, tags, headings, frontmatter, and resolving a link to a note path.
 */

export interface WikiLink {
  /** Note name or path as written: "Note", "Folder/Note". Empty for "[[#Heading]]". */
  target: string;
  heading: string | null;
  alias: string | null;
  /** `![[...]]`: an embed rather than a link. */
  embed: boolean;
  /** 0-based line in the whole file and the line's text, for backlink context. */
  line: number;
  context: string;
}

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface ParsedNote {
  /** Raw YAML between the `---` lines, or null. */
  frontmatter: string | null;
  links: WikiLink[];
  tags: string[];
  headings: Heading[];
  /** Text without frontmatter, for full-text search. */
  body: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
/** Byte order mark some Windows editors put at the start of a file. */
const BOM = 0xfeff;

/** Splits off YAML frontmatter; `bodyLine` is the line where the body starts. */
export function splitFrontmatter(text: string): {
  frontmatter: string | null;
  body: string;
  bodyLine: number;
} {
  const start = text.charCodeAt(0) === BOM ? 1 : 0;
  const match = FRONTMATTER.exec(text.slice(start));
  if (!match) return { frontmatter: null, body: text, bodyLine: 0 };
  const head = match[0];
  return {
    frontmatter: match[1] ?? "",
    body: text.slice(start + head.length),
    bodyLine: head.split("\n").length - (head.endsWith("\n") ? 1 : 0),
  };
}

export const WIKILINK = /(!?)\[\[([^[\]|#\n]*)(?:#([^[\]|\n]*))?(?:\|([^[\]\n]*))?\]\]/g;

/**
 * Obsidian tag: `#` after a line start or whitespace; letters, digits, `_`, `-`, `/` (nested
 * tags); at least one character that is not a digit.
 */
export const TAG = /(^|[\s(])#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu;

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^#{1,6}[ \t]+(.+?)[ \t#]*$/;

/** Blanks out inline code so links and tags inside it do not count (positions stay). */
function stripInline(line: string): string {
  return line.replace(/`[^`]*`/g, (code) => " ".repeat(code.length));
}

export function parseNote(text: string): ParsedNote {
  const { frontmatter, body, bodyLine } = splitFrontmatter(text);
  const links: WikiLink[] = [];
  const tags = new Set<string>();
  const headings: Heading[] = [];
  let fence: string | null = null;
  let inMath = false;

  body.split(/\r?\n/).forEach((raw, index) => {
    const line = bodyLine + index;
    const fenceMatch = FENCE.exec(raw);
    if (fence) {
      if (fenceMatch?.[1]?.[0] === fence[0] && (fenceMatch[1]?.length ?? 0) >= fence.length) {
        fence = null;
      }
      return;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      return;
    }
    if (raw.trim() === "$$") {
      inMath = !inMath;
      return;
    }
    if (inMath) return;

    const heading = HEADING.exec(raw);
    if (heading?.[1]) {
      headings.push({ level: /^#+/.exec(raw)?.[0].length ?? 1, text: heading[1], line });
    }

    const visible = stripInline(raw);
    for (const match of visible.matchAll(WIKILINK)) {
      links.push({
        target: (match[2] ?? "").trim(),
        heading: match[3]?.trim() || null,
        alias: match[4]?.trim() || null,
        embed: match[1] === "!",
        line,
        context: raw.trim().slice(0, 240),
      });
    }
    // A heading line starts with "# ", which is not a tag; tags inside it still count.
    for (const match of visible.matchAll(TAG)) {
      if (match[2]) tags.add(normalizeTag(match[2]));
    }
  });

  return { frontmatter, links, tags: [...tags], headings, body };
}

/** Tags from frontmatter: `tags: [a, b]`, `tags: a, b` or a YAML list (already parsed). */
export function frontmatterTags(value: unknown): string[] {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\s]+/)
      : [];
  return list
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeTag(item.replace(/^#/, "")))
    .filter((item) => item.length > 0);
}

/** Tags compare without case, like in Obsidian; nested parts keep their slashes. */
export function normalizeTag(tag: string): string {
  return tag.normalize("NFC").toLowerCase().replace(/\/+$/, "");
}

/** "Курсы/CS50x/Лекция 1.md" → "Лекция 1". */
export function noteName(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.md$/i, "");
}

/** Key used to find link candidates fast: the last part of the name, without case. */
export function linkKey(target: string): string {
  return noteName(target.replace(/\\/g, "/")).normalize("NFC").toLowerCase();
}

const comparable = (value: string) => value.normalize("NFC").toLowerCase().replace(/\.md$/, "");

/**
 * Finds the note a link points to, as Obsidian does: by path or by name without `.md`, case
 * does not matter. Several notes with the same name: the one in the linking note's folder,
 * then the one closest to the vault root.
 */
export function resolveLink(
  target: string,
  paths: readonly string[],
  from?: string,
): string | null {
  const wanted = comparable(target.trim().replace(/\\/g, "/").replace(/^\/+/, ""));
  if (!wanted) return null;
  if (wanted.includes("/")) {
    const exact = paths.find((path) => comparable(path) === wanted);
    if (exact) return exact;
  }

  const byName = paths.filter((path) => {
    const candidate = comparable(path);
    return candidate === wanted || candidate.endsWith(`/${wanted}`);
  });
  if (byName.length <= 1) return byName[0] ?? null;

  const folder = from?.includes("/") ? from.slice(0, from.lastIndexOf("/") + 1) : "";
  const sameFolder = byName.find(
    (path) => path.startsWith(folder) && !path.slice(folder.length).includes("/"),
  );
  if (sameFolder) return sameFolder;
  return [...byName].sort(
    (a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b),
  )[0]!;
}

/** Text inside a heading as a link anchor compares without case and extra spaces. */
export function sameHeading(a: string, b: string): boolean {
  const clean = (value: string) => value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
  return clean(a) === clean(b);
}
