import type { WatchDto } from "@shared/api";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  PROGRESS_QUERY_KEYS,
  useAddBookmark,
  useSetCompletion,
  useSetItemDone,
} from "@/app/queries";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimecode } from "@/lib/format";
import { clampRate } from "@/lib/player";
import { segmentStart, type PlanSegment } from "@/lib/segment";
import { PLAYER_STATE, tryRussianCaptions } from "@/lib/youtube-iframe";
import type { LectureNoteHandle } from "./LectureNotePane";
import { LessonPanel } from "./LessonPanel";
import { PlayerError } from "./PlayerError";
import { PlayerToolbar } from "./PlayerToolbar";
import { SegmentPanel } from "./SegmentPanel";
import { StudyHeading, StudyHints } from "./StudyDetails";
import { StudyLayout } from "./StudyLayout";
import { usePlanSegment } from "./usePlanSegment";
import { usePlaybackRate } from "./usePlaybackRate";
import { usePlayerHotkeys } from "./usePlayerHotkeys";
import { usePlayerProgress } from "./usePlayerProgress";
import { useStoredFlag } from "./useStoredFlag";
import { YouTubePlayer } from "./YouTubePlayer";

// The editor and Markdown are heavy: loaded only when the note is opened next to the video.
const LectureNotePane = lazy(async () => ({
  default: (await import("./LectureNotePane")).LectureNotePane,
}));

interface StudyScreenProps {
  watch: WatchDto;
  /** Opened from the day's plan: just this part of the video (SPEC §6.4). */
  segment: PlanSegment | null;
  /** Second to start at, from a timecode link; wins over the saved place. */
  startAt?: number;
  focus: boolean;
  onToggleFocus: () => void;
}

/** "Учёба": the player, the lecture note and the course playlist (SPEC §6.2, §6.6). */
export function StudyScreen({ watch, segment, startAt, focus, onToggleFocus }: StudyScreenProps) {
  const { video, course } = watch;
  const navigate = useNavigate();
  const client = useQueryClient();
  const hostRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<LectureNoteHandle>(null);
  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(video.embeddable ? null : 150);
  const [rate, applyRate] = usePlaybackRate(player);
  const [segmentDone, setSegmentDone] = useState(false);
  const [noteOpen, setNoteOpen] = useStoredFlag("studyhub.noteOpen", false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const completion = useSetCompletion(video.youtubeId);
  const addBookmark = useAddBookmark(video.youtubeId);
  const setItemDone = useSetItemDone();
  const completed = video.status === "done";
  const startSec =
    startAt !== undefined
      ? Math.min(startAt, Math.max(0, video.durationSec - 1))
      : segment
        ? segmentStart(segment, video.resumeSec)
        : video.resumeSec;
  const lessonUrl = (youtubeId: string) =>
    `/watch/${youtubeId}?course=${course.slug}${focus ? "&focus=1" : ""}`;

  // Watching changes course numbers, the day's plan and the calendar: refresh them on leaving.
  useEffect(
    () => () => {
      for (const queryKey of PROGRESS_QUERY_KEYS) void client.invalidateQueries({ queryKey });
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

  const time = useCallback(() => {
    try {
      return player?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  }, [player]);

  function finishSegment() {
    if (!segment || segmentDone) return;
    player?.pauseVideo();
    setSegmentDone(true);
    // A part replanned in the meantime has a new id; the server then marks it by the watched time.
    setItemDone.mutate({ id: segment.itemId, done: true });
  }

  usePlanSegment({
    player,
    playing,
    toSec: segment?.toSec,
    active: !segmentDone,
    onReached: finishSegment,
  });

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
  const quickBookmark = () => {
    const tSec = time();
    addBookmark.mutate(
      { tSec, label: `Закладка ${formatTimecode(tSec)}` },
      { onSuccess: () => toast.success(`Закладка ${formatTimecode(tSec)} добавлена`) },
    );
  };

  /** A timecode in a note: this lecture → jump; another one → open it at that second. */
  const openVideo = (youtubeId: string, seconds: number) => {
    if (youtubeId === video.youtubeId) {
      seekTo(seconds);
      player?.playVideo();
    } else {
      void navigate(`${lessonUrl(youtubeId)}&t=${Math.floor(seconds)}`);
    }
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
    timecode: () => {
      if (!noteOpen) {
        setNoteOpen(true);
        toast("Открыл конспект — нажми Alt+T ещё раз, чтобы вставить таймкод");
      } else {
        noteRef.current?.insertTimecode();
      }
    },
  });

  // After a click inside YouTube the keys go to its frame; leaving it returns them to the app.
  function returnFocus() {
    const active = document.activeElement;
    if (active instanceof HTMLIFrameElement && hostRef.current?.contains(active)) {
      hostRef.current.focus({ preventScroll: true });
    }
  }

  const playlist = <LessonPanel watch={watch} currentTime={time} onSeek={seekTo} />;
  const videoColumn = (
    <>
      <div
        ref={hostRef}
        tabIndex={-1}
        onMouseLeave={returnFocus}
        className="aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_-20px_rgb(192_132_252/0.45)] ring-1 ring-white/5 outline-none"
      >
        {errorCode !== null ? (
          <PlayerError code={errorCode} youtubeId={video.youtubeId} seconds={startSec} />
        ) : (
          <YouTubePlayer
            videoId={video.youtubeId}
            startSeconds={startSec}
            captions={video.language !== "ru"}
            onReady={(ready) => {
              setPlayer(ready);
              ready.setPlaybackRate(rate);
            }}
            onStateChange={(state) => {
              setPlaying(state === PLAYER_STATE.playing);
              if (state !== PLAYER_STATE.ended) return;
              if (segment && !segmentDone) {
                finishSegment();
              } else if (watch.nextYoutubeId) {
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

      {segment && (
        <div className="mt-4">
          <SegmentPanel
            segment={segment}
            done={segmentDone}
            currentTime={time}
            onMarkDone={finishSegment}
            onContinue={
              segment.toSec < video.durationSec - 1 ? () => player?.playVideo() : undefined
            }
            focus={focus}
          />
        </div>
      )}

      <div className="mt-5">
        <StudyHeading watch={watch} />
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
          noteOpen={noteOpen}
          onToggleNote={() => setNoteOpen(!noteOpen)}
          onShowPlaylist={noteOpen ? () => setPlaylistOpen(true) : undefined}
          previousTo={watch.previousYoutubeId ? lessonUrl(watch.previousYoutubeId) : null}
          nextTo={watch.nextYoutubeId ? lessonUrl(watch.nextYoutubeId) : null}
        />
      </div>
      <div className="mt-4">
        <StudyHints russian={video.language === "ru"} />
      </div>
    </>
  );

  return (
    <>
      <StudyLayout
        focus={focus}
        video={videoColumn}
        playlist={playlist}
        note={
          noteOpen ? (
            <Suspense
              fallback={<Skeleton className="h-full min-h-[60vh] rounded-2xl bg-surface" />}
            >
              <LectureNotePane
                ref={noteRef}
                youtubeId={video.youtubeId}
                courseSlug={course.slug}
                currentTime={time}
                onOpenVideo={openVideo}
                onClose={() => setNoteOpen(false)}
              />
            </Suspense>
          ) : null
        }
      />
      {/* With the note open, the playlist slides in from the right (SPEC §6.2). */}
      <Sheet open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <SheetContent side="right" className="w-[min(92vw,400px)] overflow-y-auto bg-night p-3">
          <SheetTitle className="px-2 pt-2 text-ink">{course.shortTitle}: программа</SheetTitle>
          <SheetDescription className="sr-only">Лекции курса и закладки</SheetDescription>
          {playlist}
        </SheetContent>
      </Sheet>
    </>
  );
}
