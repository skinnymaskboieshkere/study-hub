import { parseNote, sameHeading } from "@shared/notes";
import { useEffect, type RefObject } from "react";
import { useSearchParams } from "react-router";
import type { NoteEditorHandle } from "./NoteEditor";

/**
 * `?heading=` / `?line=` after opening a note ([[Note#Heading]], a backlink): scroll there once
 * the note is loaded, then drop the parameter.
 */
export function useNoteJump(input: {
  ready: boolean;
  text: string;
  preview: boolean;
  editor: RefObject<NoteEditorHandle | null>;
}) {
  const [params, setParams] = useSearchParams();
  const heading = params.get("heading");
  const lineParam = params.get("line");
  const { ready } = input;

  useEffect(() => {
    if (!ready || (!heading && !lineParam)) return;
    const line = lineParam
      ? Number(lineParam)
      : parseNote(input.text).headings.find((item) => sameHeading(item.text, heading ?? ""))?.line;
    if (line !== undefined && Number.isFinite(line)) {
      if (input.preview && heading) {
        const target = [...document.querySelectorAll<HTMLElement>("[data-heading]")].find(
          (element) => sameHeading(element.dataset.heading ?? "", heading),
        );
        target?.scrollIntoView({ block: "start" });
      } else {
        input.editor.current?.goToLine(line);
      }
    }
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("heading");
        next.delete("line");
        return next;
      },
      { replace: true },
    );
    // Runs once per jump request, when the note is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, heading, lineParam]);
}
