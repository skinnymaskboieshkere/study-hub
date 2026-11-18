import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  keymap,
  placeholder,
} from "@codemirror/view";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { tagCompletion, wikilinkCompletion, type CompletionData } from "@/lib/editor/completion";
import { editorHighlight, editorTheme } from "@/lib/editor/theme";
import { obsidianSyntax } from "@/lib/editor/wikilinks";

export interface NoteEditorHandle {
  /** Puts the cursor at the start of a line and scrolls it into view (0-based). */
  goToLine: (line: number) => void;
  focus: () => void;
}

interface NoteEditorProps {
  /** Initial text; the editor owns it afterwards. Remount (key) to load another version. */
  initialText: string;
  onChange: (text: string) => void;
  completion: CompletionData;
  onOpenLink: (target: string, heading: string | null) => void;
  ref?: Ref<NoteEditorHandle>;
}

/** CodeMirror 6 editor for one note (SPEC §6.5): Markdown, code in fences, `[[`, `#`. */
export function NoteEditor({
  initialText,
  onChange,
  completion,
  onOpenLink,
  ref,
}: NoteEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Callbacks change on every render; the editor reads the latest ones through refs.
  const callbacks = useRef({ onChange, onOpenLink, completion });
  useEffect(() => {
    callbacks.current = { onChange, onOpenLink, completion };
  });

  useEffect(() => {
    if (!host.current) return;
    const data: CompletionData = {
      notes: () => callbacks.current.completion.notes(),
      tags: () => callbacks.current.completion.tags(),
      headings: (target) => callbacks.current.completion.headings(target),
    };
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialText,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          // YAML properties at the top stay YAML, not a Markdown heading.
          yamlFrontmatter({
            content: markdown({ base: markdownLanguage, codeLanguages: languages }),
          }),
          syntaxHighlighting(editorHighlight),
          autocompletion({
            override: [wikilinkCompletion(data), tagCompletion(data)],
            icons: false,
          }),
          obsidianSyntax((target, heading) => callbacks.current.onOpenLink(target, heading)),
          placeholder("Начни писать… [[ — ссылка на заметку, # — тег, $…$ — формула"),
          editorTheme,
          EditorView.contentAttributes.of({
            "aria-label": "Текст заметки",
            spellcheck: "true",
            lang: "ru",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The text is read once: a new version of the note remounts the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    goToLine(line) {
      const editor = view.current;
      if (!editor) return;
      const target = editor.state.doc.line(Math.min(editor.state.doc.lines, line + 1));
      editor.dispatch({
        selection: { anchor: target.from },
        effects: EditorView.scrollIntoView(target.from, { y: "start", yMargin: 24 }),
      });
      editor.focus();
    },
    focus() {
      view.current?.focus();
    },
  }));

  return <div ref={host} className="h-full min-h-0" />;
}
