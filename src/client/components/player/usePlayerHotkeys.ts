import { useEffect, useRef } from "react";

export interface PlayerHotkeyActions {
  togglePlay: () => void;
  seekBy: (seconds: number) => void;
  changeRate: (step: number) => void;
  addBookmark: () => void;
  toggleFocus: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest("[role=dialog], [role=menu], [role=listbox]") !== null
  );
}

/**
 * Player hotkeys (SPEC §6.2): Space — play/pause, ←/→ — 10 s, Shift+←/→ — speed,
 * B — bookmark, F — focus mode. Never fire while typing (notes come in stage 4).
 */
export function usePlayerHotkeys(actions: PlayerHotkeyActions) {
  const latest = useRef(actions);

  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const onButton =
        event.target instanceof HTMLElement && event.target.closest("button, a") !== null;

      switch (event.code) {
        case "Space":
          // Space on a focused button presses that button instead.
          if (onButton) return;
          latest.current.togglePlay();
          break;
        case "ArrowLeft":
          if (event.shiftKey) latest.current.changeRate(-0.25);
          else latest.current.seekBy(-10);
          break;
        case "ArrowRight":
          if (event.shiftKey) latest.current.changeRate(0.25);
          else latest.current.seekBy(10);
          break;
        case "KeyB":
          latest.current.addBookmark();
          break;
        case "KeyF":
          latest.current.toggleFocus();
          break;
        default:
          return;
      }
      event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
