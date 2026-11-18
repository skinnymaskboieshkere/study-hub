import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/** The editor in the app's night palette (tokens from styles/index.css). */
export const editorTheme = EditorView.theme(
  {
    "&": {
      color: "var(--color-ink)",
      backgroundColor: "transparent",
      fontSize: "16px",
      height: "100%",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: "var(--font-sans)",
      lineHeight: "1.7",
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: "var(--color-lilac)",
      padding: "8px 4px 40vh",
      maxWidth: "48rem",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-lilac)", borderLeftWidth: "2px" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
      { backgroundColor: "rgb(139 92 246 / 0.32)" },
    ".cm-activeLine": { backgroundColor: "rgb(255 255 255 / 0.025)" },
    ".cm-selectionMatch": { backgroundColor: "rgb(139 92 246 / 0.18)" },
    ".cm-matchingBracket": { backgroundColor: "rgb(139 92 246 / 0.25)", outline: "none" },
    ".cm-placeholder": { color: "var(--color-ink-muted)" },
    ".cm-wikilink": {
      color: "var(--color-lilac)",
      textDecoration: "underline",
      textDecorationColor: "rgb(167 139 250 / 0.35)",
      textUnderlineOffset: "3px",
    },
    ".cm-tag": { color: "var(--color-lilac)" },
    ".cm-tooltip": {
      backgroundColor: "var(--color-surface-2)",
      border: "1px solid var(--color-line)",
      borderRadius: "10px",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-sans)", maxHeight: "16rem" },
    ".cm-tooltip-autocomplete > ul > li": { padding: "4px 10px" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "rgb(139 92 246 / 0.35)",
      color: "var(--color-ink)",
    },
    ".cm-completionDetail": {
      color: "var(--color-ink-muted)",
      marginLeft: "0.8em",
      fontStyle: "normal",
    },
    ".cm-panels": { backgroundColor: "var(--color-surface-2)", color: "var(--color-ink)" },
    ".cm-panels input, .cm-panels button": { color: "var(--color-ink)" },
    ".cm-searchMatch": { backgroundColor: "rgb(251 191 36 / 0.25)" },
  },
  { dark: true },
);

/** Markdown looks like a lighter version of the preview; code inside fences gets colors too. */
export const editorHighlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: "1.6em", fontWeight: "650" },
  { tag: t.heading2, fontSize: "1.35em", fontWeight: "650" },
  { tag: t.heading3, fontSize: "1.15em", fontWeight: "650" },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: "650" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: [t.link, t.url], color: "var(--color-lilac)" },
  { tag: t.quote, color: "var(--color-ink-muted)" },
  { tag: t.monospace, fontFamily: "var(--font-mono)", fontSize: "0.9em", color: "#e9d5ff" },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], color: "#6f6987" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#7d7891", fontStyle: "italic" },
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier], color: "#c084fc" },
  { tag: [t.string, t.special(t.string)], color: "#86efac" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#fbbf24" },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], color: "#60a5fa" },
  { tag: [t.typeName, t.className], color: "#22d3ee" },
]);
