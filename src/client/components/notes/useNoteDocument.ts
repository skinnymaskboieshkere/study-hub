import type { NoteFileDto } from "@shared/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchNote, saveNote } from "@/app/notes-queries";
import { ApiError, beacon } from "@/lib/api";

const SAVE_AFTER_MS = 700;
const CHECK_DISK_EVERY_MS = 3000;

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

export type NoteDocState =
  | { phase: "idle" }
  | { phase: "loading"; path: string }
  | { phase: "error"; path: string; message: string; notFound: boolean }
  | {
      phase: "ready";
      path: string;
      /** Grows when the text is replaced from disk: the editor remounts with it. */
      version: number;
      initialText: string;
      frontmatter: NoteFileDto["frontmatter"];
    };

interface Base {
  path: string;
  hash: string;
  /** Text with "\n" line ends, as the editor keeps it. */
  content: string;
  /** Line ends of the file: Windows files stay "\r\n" on disk. */
  eol: "\n" | "\r\n";
}

const normalize = (text: string) => text.replace(/\r\n/g, "\n");
const toDisk = (text: string, eol: Base["eol"]) =>
  eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text;

/**
 * One open note: loads it, autosaves edits, and watches the file on disk. A change from
 * Obsidian or OneDrive replaces the text when there are no unsaved edits; otherwise it is a
 * conflict and nothing is overwritten (SPEC §9.3, ASSESSMENT risk 1).
 */
export function useNoteDocument(path: string | null) {
  const [doc, setDoc] = useState<NoteDocState>({ phase: "idle" });
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [conflict, setConflict] = useState<{ content: string; hash: string } | null>(null);
  const base = useRef<Base | null>(null);
  const draft = useRef("");
  const timer = useRef<number | undefined>(undefined);
  const saving = useRef(false);
  const inConflict = useRef(false);

  const load = useCallback((note: NoteFileDto) => {
    const content = normalize(note.content);
    base.current = {
      path: note.path,
      hash: note.hash,
      content,
      eol: note.content.includes("\r\n") ? "\r\n" : "\n",
    };
    draft.current = content;
    inConflict.current = false;
    setConflict(null);
    setText(content);
    setStatus("saved");
    setDoc((previous) => ({
      phase: "ready",
      path: note.path,
      version: (previous.phase === "ready" ? previous.version : 0) + 1,
      initialText: content,
      frontmatter: note.frontmatter,
    }));
  }, []);

  // `save` plans the next save itself; it is reached through a ref to avoid a self-reference.
  const saveRef = useRef<() => Promise<void>>(async () => undefined);
  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveRef.current(), SAVE_AFTER_MS);
  }, []);

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    const current = base.current;
    const text = draft.current;
    if (!current || text === current.content || inConflict.current) return;
    if (saving.current) {
      schedule();
      return;
    }
    saving.current = true;
    setStatus("saving");
    try {
      const saved = await saveNote(current.path, toDisk(text, current.eol), current.hash);
      if (base.current?.path === current.path) {
        base.current = { ...current, hash: saved.hash, content: text };
        setStatus(draft.current === text ? "saved" : "dirty");
      }
    } catch (error) {
      const body =
        error instanceof ApiError
          ? (error.body as { current?: { content: string; hash: string } })
          : undefined;
      if (error instanceof ApiError && error.status === 409 && body?.current) {
        inConflict.current = true;
        setConflict(body.current);
        setStatus("conflict");
      } else {
        setStatus("error");
        toast.error(error instanceof Error ? error.message : "Не удалось сохранить заметку");
      }
    } finally {
      saving.current = false;
      if (base.current && draft.current !== base.current.content && !inConflict.current) {
        schedule();
      }
    }
  }, [schedule]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Whatever is not saved yet goes out with a beacon: survives closing the tab. */
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const current = base.current;
    if (!current || draft.current === current.content || inConflict.current) return;
    beacon("/api/notes/file", {
      path: current.path,
      content: toDisk(draft.current, current.eol),
      baseHash: current.hash,
    });
    base.current = { ...current, content: draft.current };
  }, []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    base.current = null;

    fetchNote(path)
      .then((note) => !cancelled && load(note))
      .catch((error: unknown) => {
        if (cancelled) return;
        setDoc({
          phase: "error",
          path,
          message: error instanceof Error ? error.message : "Не удалось открыть заметку",
          notFound: error instanceof ApiError && error.status === 404,
        });
      });

    // The file may change in Obsidian or through OneDrive while it is open here.
    const check = window.setInterval(() => {
      const current = base.current;
      if (!current || saving.current || document.hidden) return;
      fetchNote(path)
        .then((note) => {
          if (cancelled || !base.current || saving.current || note.hash === base.current.hash)
            return;
          const remote = normalize(note.content);
          if (remote === draft.current) {
            base.current = { ...base.current, hash: note.hash, content: remote };
          } else if (draft.current === base.current.content) {
            load(note);
          } else if (!inConflict.current) {
            inConflict.current = true;
            setConflict({ content: note.content, hash: note.hash });
            setStatus("conflict");
          }
        })
        .catch(() => undefined);
    }, CHECK_DISK_EVERY_MS);

    window.addEventListener("pagehide", flush);
    return () => {
      cancelled = true;
      window.clearInterval(check);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [path, load, flush]);

  const onChange = useCallback(
    (next: string) => {
      draft.current = next;
      setText(next);
      if (inConflict.current) return;
      setStatus("dirty");
      schedule();
    },
    [schedule],
  );

  /** Conflict: take the version from disk and drop the edits made here. */
  const takeDisk = useCallback(() => {
    if (!conflict || !base.current) return;
    load({
      path: base.current.path,
      title: "",
      content: conflict.content,
      hash: conflict.hash,
      mtimeMs: 0,
      frontmatter: doc.phase === "ready" ? doc.frontmatter : null,
    });
  }, [conflict, doc, load]);

  /** Conflict: keep the text written here and save it over the disk version. */
  const keepMine = useCallback(() => {
    if (!conflict || !base.current) return;
    base.current = { ...base.current, hash: conflict.hash, content: normalize(conflict.content) };
    inConflict.current = false;
    setConflict(null);
    void save();
  }, [conflict, save]);

  // A state left from the previous note counts as loading the new one.
  const visible: NoteDocState = !path
    ? { phase: "idle" }
    : doc.phase !== "idle" && doc.path === path
      ? doc
      : { phase: "loading", path };

  return { doc: visible, text, status, conflict, onChange, saveNow: save, takeDisk, keepMine };
}
