import { useCallback, useState } from "react";

export type NotesOverlay = "switcher" | "search" | "palette" | "rename" | "trash";

/** Which dialog of the notes screen is open; only one at a time. */
export function useNotesOverlays() {
  const [open, setOpen] = useState<NotesOverlay | null>(null);
  const [searchTag, setSearchTag] = useState("");

  const show = useCallback((overlay: NotesOverlay) => setOpen(overlay), []);
  const showTag = useCallback((tag: string) => {
    setSearchTag(tag);
    setOpen("search");
  }, []);
  const close = useCallback(() => setOpen(null), []);

  return { open, show, showTag, close, searchTag, setSearchTag };
}

export type NotesOverlays = ReturnType<typeof useNotesOverlays>;
