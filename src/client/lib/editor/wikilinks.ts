import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { TAG, WIKILINK } from "@shared/notes";

const linkDecorator = new MatchDecorator({
  regexp: new RegExp(WIKILINK.source, "g"),
  decoration: Decoration.mark({ class: "cm-wikilink" }),
});

const tagDecorator = new MatchDecorator({
  regexp: new RegExp(TAG.source, "gu"),
  decorate: (add, from, _to, match) => {
    const start = from + (match[1]?.length ?? 0);
    add(start, start + 1 + (match[2]?.length ?? 0), Decoration.mark({ class: "cm-tag" }));
  },
});

function decorations(decorator: MatchDecorator) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        this.decorations = decorator.updateDeco(update, this.decorations);
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

/** The link under a position: `[[Target#Heading|alias]]` → target and heading. */
export function linkAt(
  lineText: string,
  offset: number,
): { target: string; heading: string | null } | null {
  for (const match of lineText.matchAll(new RegExp(WIKILINK.source, "g"))) {
    const start = match.index ?? 0;
    if (offset >= start && offset <= start + match[0].length) {
      return { target: (match[2] ?? "").trim(), heading: match[3]?.trim() || null };
    }
  }
  return null;
}

const MARKDOWN_OR_BARE_URL = /\[[^\]\n]*\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s)<>\]]+/g;

/** The web address under a position: inside `[label](url)` or written bare. */
export function urlAt(lineText: string, offset: number): string | null {
  for (const match of lineText.matchAll(MARKDOWN_OR_BARE_URL)) {
    const start = match.index ?? 0;
    if (offset >= start && offset <= start + match[0].length) return match[1] ?? match[0];
  }
  return null;
}

/**
 * Colors links and tags in the editor; Ctrl/Cmd+click on a link opens it (like Obsidian), on a
 * YouTube link or timecode — the lecture at that second.
 */
export function obsidianSyntax(
  onOpenLink: (target: string, heading: string | null) => void,
  onOpenUrl: (url: string) => boolean,
) {
  return [
    decorations(linkDecorator),
    decorations(tagDecorator),
    EditorView.domEventHandlers({
      mousedown(event, view) {
        if (!(event.ctrlKey || event.metaKey) || event.button !== 0) return false;
        const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (position === null) return false;
        const line = view.state.doc.lineAt(position);
        const link = linkAt(line.text, position - line.from);
        if (link) {
          event.preventDefault();
          onOpenLink(link.target, link.heading);
          return true;
        }
        const url = urlAt(line.text, position - line.from);
        if (url && onOpenUrl(url)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    }),
  ];
}
