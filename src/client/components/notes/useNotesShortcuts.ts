import { useEffect, useRef } from "react";

/** Ctrl/Cmd+O — quick switcher, Ctrl/Cmd+Shift+F — search, Ctrl/Cmd+P — command palette (SPEC §6.5). */
export function useNotesShortcuts(actions: {
  onSwitch: () => void;
  onSearch: () => void;
  onPalette: () => void;
}) {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      // event.code keeps working on the Russian layout.
      if (event.code === "KeyO" && !event.shiftKey) {
        event.preventDefault();
        latest.current.onSwitch();
      } else if (event.code === "KeyP" && !event.shiftKey) {
        // Instead of the browser's print dialog.
        event.preventDefault();
        latest.current.onPalette();
      } else if (event.code === "KeyF" && event.shiftKey) {
        event.preventDefault();
        latest.current.onSearch();
      }
    }
    // Capture phase: before the editor and before the browser's "open file" dialog.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
