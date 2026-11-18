import { cn } from "cn";
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

const RATIO_KEY = "studyhub.studySplit";
const MIN = 0.35;
const MAX = 0.75;

function readRatio(): number {
  try {
    const value = Number(localStorage.getItem(RATIO_KEY));
    return value >= MIN && value <= MAX ? value : 0.58;
  } catch {
    return 0.58;
  }
}

function saveRatio(value: number) {
  try {
    localStorage.setItem(RATIO_KEY, value.toFixed(3));
  } catch {
    // Private mode: the width is just not remembered.
  }
}

interface StudyLayoutProps {
  focus: boolean;
  /** The lecture note next to the video; null — the playlist takes that place. */
  note: ReactNode | null;
  video: ReactNode;
  playlist: ReactNode;
}

/**
 * "Учёба" (SPEC §6.2): video and playlist, or video and lecture note with a divider that can be
 * dragged. On phones everything stacks.
 */
export function StudyLayout({ focus, note, video, playlist }: StudyLayoutProps) {
  const [ratio, setRatio] = useState(readRatio);
  const [dragging, setDragging] = useState(false);

  if (!note) {
    return (
      // grid-cols-1 = minmax(0, 1fr): without it the 16:9 player box stretches the column.
      <div
        className={cn(
          "grid grid-cols-1 items-start gap-6 pt-4",
          !focus && "lg:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        <div className="min-w-0">{video}</div>
        {!focus && playlist}
      </div>
    );
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!box) return;
    setRatio(Math.min(MAX, Math.max(MIN, (event.clientX - box.left) / box.width)));
  }
  function onPointerUp() {
    setDragging(false);
    saveRatio(ratio);
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = Math.min(MAX, Math.max(MIN, ratio + (event.key === "ArrowLeft" ? -0.03 : 0.03)));
    setRatio(next);
    saveRatio(next);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-6 pt-4 lg:flex lg:gap-0",
        // While dragging, the YouTube frame must not swallow the pointer.
        dragging && "select-none [&_iframe]:pointer-events-none",
      )}
      style={{ ["--video-share" as string]: `${ratio * 100}%` }}
    >
      <div className="min-w-0 lg:w-[var(--video-share)] lg:shrink-0">{video}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Граница между видео и конспектом"
        aria-valuemin={MIN * 100}
        aria-valuemax={MAX * 100}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className="group hidden w-6 shrink-0 cursor-col-resize justify-center self-stretch lg:flex"
      >
        <span
          className={cn(
            "h-full w-px bg-line transition-colors group-hover:bg-lilac/60 group-focus-visible:bg-lilac",
            dragging && "bg-lilac",
          )}
        />
      </div>
      <div className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:flex-1">{note}</div>
    </div>
  );
}
