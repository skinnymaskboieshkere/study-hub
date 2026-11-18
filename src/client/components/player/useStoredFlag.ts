import { useState } from "react";

/** An on/off choice remembered in this browser (a per-viewer convenience, not data). */
export function useStoredFlag(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });

  const update = (next: boolean) => {
    setValue(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // Private mode: the choice is just not remembered.
    }
  };

  return [value, update] as const;
}
