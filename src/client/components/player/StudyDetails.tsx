import { hotkeyLabel, type TimecodeHotkey } from "@shared/settings";
import type { WatchDto } from "@shared/api";
import { Link } from "react-router";
import { KIND_LABEL } from "@/app/labels";
import { formatDuration } from "@/lib/format";

/** Course link, lecture title and language under the player. */
export function StudyHeading({ watch }: { watch: WatchDto }) {
  const { video, course } = watch;
  return (
    <div>
      <Link
        to={`/courses/${course.slug}`}
        className="text-sm text-lilac underline-offset-4 hover:underline"
      >
        {course.shortTitle} · {course.title}
      </Link>
      <h1 className="mt-1 text-2xl leading-snug font-semibold text-ink">{video.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {KIND_LABEL[video.kind]} ·{" "}
        <span className="font-mono">{formatDuration(video.durationSec)}</span>
        {video.language === "ru" ? " · русская озвучка" : " · английский, русские субтитры"}
      </p>
    </div>
  );
}

/** Keyboard reminder (SPEC §6.2, §6.6). */
export function StudyHints({
  russian,
  captions,
  hotkey,
}: {
  russian: boolean;
  captions: boolean;
  hotkey: TimecodeHotkey;
}) {
  return (
    <p className="text-xs leading-relaxed text-ink-muted">
      Пробел — пауза · ←/→ — 10 секунд · Shift+←/→ — скорость · B — закладка · F — фокус-режим ·{" "}
      {hotkeyLabel(hotkey)} — таймкод в конспект.
      {!russian &&
        captions &&
        " Русские субтитры включаются сами; если их нет — в плеере: ⚙ → Субтитры → Перевести → Русский."}
    </p>
  );
}
