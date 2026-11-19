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
import { timecodeInsertion } from "@shared/note-templates";
import { isTimecodeHotkey, type TimecodeHotkey } from "@shared/settings";
import { toast } from "sonner";
import { tagCompletion, wikilinkCompletion, type CompletionData } from "@/lib/editor/completion";
import { editorHighlight, editorTheme } from "@/lib/editor/theme";
import { obsidianSyntax } from "@/lib/editor/wikilinks";

export interface NoteEditorHandle {
  /** Puts the cursor at the start of a line and scrolls it into view (0-based). */
  goToLine: (line: number) => void;
  focus: () => void;
  /** Inserts text at the cursor (a template). */
  insert: (text: string) => void;
  /** The timecode hotkey pressed outside the editor: never lands in the YAML properties. */
  insertTimecode: (link: string) => void;
}

interface NoteEditorProps {
  /** Initial text; the editor owns it afterwards. Remount (key) to load another version. */
  initialText: string;
  onChange: (text: string) => void;
  completion: CompletionData;
  onOpenLink: (target: string, heading: string | null) => void;
  /** Ctrl+click on a web link; true when the app handled it (a YouTube timecode). */
  onOpenUrl?: (url: string) => boolean;
  /** Timecode for the hotkey (SPEC §6.6); null when no video plays next to the note. */
  onTimecode?: () => string | null;
  timecodeHotkey?: TimecodeHotkey;
  /** A pasted or dropped picture: saved to the vault, returns the name for `![[...]]`. */
  onPasteImage?: (file: File) => Promise<string>;
  ref?: Ref<NoteEditorHandle>;
}

/** Puts text at the cursor with a space before it when it would stick to a word. */
function insertText(view: EditorView, text: string) {
  const { from, to } = view.state.selection.main;
  const before = view.state.sliceDoc(Math.max(0, from - 1), from);
  const insert = before && !/\s/.test(before) ? ` ${text}` : text;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    scrollIntoView: true,
    userEvent: "input",
  });
  view.focus();
}

/** The timecode at the cursor, or in the "Таймкоды" section when the cursor was not placed. */
function insertTimecode(view: EditorView, link: string, cursorPlaced: boolean) {
  const { from } = view.state.selection.main;
  const at = timecodeInsertion(view.state.doc.toString(), from, cursorPlaced, link);
  if (cursorPlaced && at.from === from) return insertText(view, link);
  view.dispatch({
    changes: { from: at.from, insert: at.insert },
    selection: { anchor: at.from + at.insert.length },
    scrollIntoView: true,
    userEvent: "input",
  });
}

/** CodeMirror 6 editor for one note (SPEC §6.5): Markdown, code in fences, `[[`, `#`. */
export function NoteEditor({
  initialText,
  onChange,
  completion,
  onOpenLink,
  onOpenUrl,
  onTimecode,
  timecodeHotkey = "alt-t",
  onPasteImage,
  ref,
}: NoteEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Whether the student put the cursor somewhere; until then a timecode goes to "Таймкоды".
  const placed = useRef(false);
  // Callbacks change on every render; the editor reads the latest ones through refs.
  const callbacks = useRef({
    onChange,
    onOpenLink,
    onOpenUrl,
    onTimecode,
    timecodeHotkey,
    onPasteImage,
    completion,
  });
  useEffect(() => {
    callbacks.current = {
      onChange,
      onOpenLink,
      onOpenUrl,
      onTimecode,
      timecodeHotkey,
      onPasteImage,
      completion,
    };
  });

  useEffect(() => {
    if (!host.current) return;
    const data: CompletionData = {
      notes: () => callbacks.current.completion.notes(),
      tags: () => callbacks.current.completion.tags(),
      headings: (target) => callbacks.current.completion.headings(target),
    };
    const pasteImages = (files: FileList | undefined, view: EditorView): boolean => {
      const images = [...(files ?? [])].filter((file) => file.type.startsWith("image/"));
      const upload = callbacks.current.onPasteImage;
      if (images.length === 0 || !upload) return false;
      void Promise.all(images.map((image) => upload(image))).then(
        (names) =>
          insertText(view, names.map((name) => `![[${name}]]`).join(String.fromCharCode(10))),
        (error: unknown) =>
          toast.error(error instanceof Error ? error.message : "Картинку не вставить"),
      );
      return true;
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
          // The timecode hotkey (Alt+T by default, set in Settings; BRIEF: not Ctrl+Shift+T).
          EditorView.domEventHandlers({
            keydown: (event, target) => {
              if (!isTimecodeHotkey(event, callbacks.current.timecodeHotkey)) return false;
              const text = callbacks.current.onTimecode?.();
              if (!text) return false;
              event.preventDefault();
              insertTimecode(target, text, true);
              return true;
            },
          }),
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
          obsidianSyntax(
            (target, heading) => callbacks.current.onOpenLink(target, heading),
            (url) => callbacks.current.onOpenUrl?.(url) ?? false,
          ),
          placeholder("Начни писать… [[ — ссылка на заметку, # — тег, $…$ — формула"),
          editorTheme,
          EditorView.contentAttributes.of({
            "aria-label": "Текст заметки",
            spellcheck: "true",
            lang: "ru",
          }),
          EditorView.domEventHandlers({
            focus: () => {
              placed.current = true;
            },
            // A picture from the clipboard or dragged in goes to attachments/ (SPEC §6.5).
            paste: (event, view) => pasteImages(event.clipboardData?.files, view),
            drop: (event, view) => {
              const at = view.posAtCoords({ x: event.clientX, y: event.clientY });
              if (at !== null) view.dispatch({ selection: { anchor: at } });
              return pasteImages(event.dataTransfer?.files, view);
            },
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
    insert(text) {
      if (view.current) insertText(view.current, text);
    },
    insertTimecode(link) {
      if (view.current) insertTimecode(view.current, link, placed.current);
    },
  }));

  return <div ref={host} className="h-full min-h-0" />;
}
