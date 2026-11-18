import type { WatchDto } from "@shared/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { KIND_LABEL } from "@/app/labels";
import { keys, useAddBookmark, useSetCompletion } from "@/app/queries";
import { formatDuration, formatTimecode } from "@/lib/format";
import { clampRate, PLAYBACK_RATES } from "@/lib/player";
import { PLAYER_STATE, tryRussianCaptions } from "@/lib/youtube-iframe";
import { LessonPanel } from "./LessonPanel";
import { PlayerError } from "./PlayerError";
import { PlayerToolbar } from "./PlayerToolbar";
import { usePlayerHotkeys } from "./usePlayerHotkeys";
import { usePlayerProgress } from "./usePlayerProgress";
import { YouTubePlayer } from "./YouTubePlayer";

const RATE_KEY = "studyhub.playbackRate";

function readStoredRate(): number {
  try {
    const value = Number(localStorage.getItem(RATE_KEY));
    return PLAYBACK_RATES.includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

interface StudyScreenProps {
  watch: WatchDto;
  focus: boolean;
  onToggleFocus: () => void;
}

/** "Учёба": the player, its controls and the course playlist (SPEC §6.2). Keyed by video. */
export function StudyScreen({ watch, focus, onToggleFocus }: StudyScreenProps) {
  const { video, course } = watch;
  const navigate = useNavigate();
  const client = useQueryClient();
  const hostRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(video.embeddable ? null : 150);
  const [rate, setRate] = useState(readStoredRate);
  const completion = useSetCompletion(video.youtubeId);
  const addBookmark = useAddBookmark(video.youtubeId);
  const completed = video.status === "done";
  const lessonUrl = (youtubeId: string) =>
    `/watch/${youtubeId}?course=${course.slug}${focus ? "&focus=1" : ""}`;

  // Course numbers changed while watching: refresh them when leaving the screen.
  useEffect(
    () => () => {
      void client.invalidateQueries({ queryKey: keys.catalog });
      void client.invalidateQueries({ queryKey: ["course"] });
      void client.invalidateQueries({ queryKey: keys.continue });
    },
    [client],
  );

  usePlayerProgress({
    player,
    youtubeId: video.youtubeId,
    playing,
    alreadyCompleted: completed,
    onCompleted: () => {
      toast.success("Лекция засчитана: просмотрено 90%");
      void client.invalidateQueries({ queryKey: ["watch", video.youtubeId] });
    },
  });

  const time = () => {
    try {
      return player?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  };
  const seekTo = (seconds: number) => player?.seekTo(Math.max(0, seconds), true);
  // The player reports the new time with a delay, so quick ←/→ presses add up here.
  const seekTarget = useRef<{ seconds: number; until: number } | null>(null);
  const seekBy = (delta: number) => {
    const now = Date.now();
    const pending = seekTarget.current;
    const base = pending && pending.until > now ? pending.seconds : time();
    const seconds = Math.max(0, base + delta);
    seekTarget.current = { seconds, until: now + 1000 };
    seekTo(seconds);
  };
  const applyRate = (next: number) => {
    const clamped = clampRate(next);
    setRate(clamped);
    player?.setPlaybackRate(clamped);
    try {
      localStorage.setItem(RATE_KEY, String(clamped));
    } catch {
      // Private mode: the speed is just not remembered.
    }
  };
  const quickBookmark = () => {
    const tSec = time();
    addBookmark.mutate(
      { tSec, label: `Закладка ${formatTimecode(tSec)}` },
      { onSuccess: () => toast.success(`Закладка ${formatTimecode(tSec)} добавлена`) },
    );
  };

  usePlayerHotkeys({
    togglePlay: () => (playing ? player?.pauseVideo() : player?.playVideo()),
    seekBy,
    changeRate: (step) => {
      applyRate(rate + step);
      toast(`Скорость ${clampRate(rate + step)}×`);
    },
    addBookmark: quickBookmark,
    toggleFocus: onToggleFocus,
  });

  // After a click inside YouTube the keys go to its frame; leaving it returns them to the app.
  function returnFocus() {
    const active = document.activeElement;
    if (active instanceof HTMLIFrameElement && hostRef.current?.contains(active)) {
      hostRef.current.focus({ preventScroll: true });
    }
  }

  return (
    // grid-cols-1 = minmax(0, 1fr): without it the 16:9 player box stretches the column.
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-6 pt-4",
        !focus && "lg:grid-cols-[minmax(0,1fr)_360px]",
      )}
    >
      <div className="min-w-0">
        <div
          ref={hostRef}
          tabIndex={-1}
          onMouseLeave={returnFocus}
          className="aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_-20px_rgb(192_132_252/0.45)] ring-1 ring-white/5 outline-none"
        >
          {errorCode !== null ? (
            <PlayerError code={errorCode} youtubeId={video.youtubeId} seconds={video.resumeSec} />
          ) : (
            <YouTubePlayer
              videoId={video.youtubeId}
              startSeconds={video.resumeSec}
              captions={video.language !== "ru"}
              onReady={(ready) => {
                setPlayer(ready);
                ready.setPlaybackRate(rate);
              }}
              onStateChange={(state) => {
                setPlaying(state === PLAYER_STATE.playing);
                if (state === PLAYER_STATE.ended && watch.nextYoutubeId) {
                  const next = lessonUrl(watch.nextYoutubeId);
                  toast("Видео закончилось", {
                    action: { label: "Следующее", onClick: () => navigate(next) },
                  });
                }
              }}
              onApiChange={(ready) => {
                if (video.language !== "ru") tryRussianCaptions(ready);
              }}
              onError={setErrorCode}
            />
          )}
        </div>

        <div className="mt-5">
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

        <div className="mt-4">
          <PlayerToolbar
            completed={completed}
            completionPending={completion.isPending}
            onToggleCompleted={() =>
              completion.mutate(!completed, { onError: (error) => toast.error(error.message) })
            }
            rate={rate}
            onRateChange={applyRate}
            onBookmark={quickBookmark}
            focus={focus}
            onToggleFocus={onToggleFocus}
            previousTo={watch.previousYoutubeId ? lessonUrl(watch.previousYoutubeId) : null}
            nextTo={watch.nextYoutubeId ? lessonUrl(watch.nextYoutubeId) : null}
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Пробел — пауза · ←/→ — 10 секунд · Shift+←/→ — скорость · B — закладка · F — фокус-режим.
          {video.language !== "ru" &&
            " Русские субтитры включаются сами; если их нет — в плеере: ⚙ → Субтитры → Перевести → Русский."}
        </p>
      </div>

      {!focus && <LessonPanel watch={watch} currentTime={time} onSeek={seekTo} />}
    </div>
  );
}
