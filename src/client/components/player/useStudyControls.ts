import { useRef, type RefObject } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { hotkeyLabel } from "@shared/settings";
import { useAddBookmark } from "@/app/queries";
import { useAppSettings } from "@/app/settings-queries";
import { formatTimecode } from "@/lib/format";
import { clampRate } from "@/lib/player";
import type { LectureNoteHandle } from "./LectureNotePane";
import { usePlayerHotkeys } from "./usePlayerHotkeys";

interface StudyControlsInput {
  player: YT.Player | null;
  playing: boolean;
  youtubeId: string;
  time: () => number;
  rate: number;
  applyRate: (rate: number) => void;
  onToggleFocus: () => void;
  /** URL of another lesson of this course (keeps focus mode). */
  lessonUrl: (youtubeId: string) => string;
  noteOpen: boolean;
  setNoteOpen: (open: boolean) => void;
  note: RefObject<LectureNoteHandle | null>;
}

/** Seeking, bookmarks, timecode clicks and the player hotkeys of the study screen (SPEC §6.2). */
export function useStudyControls(input: StudyControlsInput) {
  const { player, time } = input;
  const navigate = useNavigate();
  const addBookmark = useAddBookmark(input.youtubeId);
  const { timecodeHotkey } = useAppSettings();

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

  const bookmark = () => {
    const tSec = time();
    addBookmark.mutate(
      { tSec, label: `Закладка ${formatTimecode(tSec)}` },
      { onSuccess: () => toast.success(`Закладка ${formatTimecode(tSec)} добавлена`) },
    );
  };

  /** A timecode in a note: this lecture → jump; another one → open it at that second. */
  const openVideo = (youtubeId: string, seconds: number) => {
    if (youtubeId === input.youtubeId) {
      seekTo(seconds);
      player?.playVideo();
    } else {
      void navigate(`${input.lessonUrl(youtubeId)}&t=${Math.floor(seconds)}`);
    }
  };

  usePlayerHotkeys({
    togglePlay: () => (input.playing ? player?.pauseVideo() : player?.playVideo()),
    seekBy,
    changeRate: (step) => {
      input.applyRate(input.rate + step);
      toast(`Скорость ${clampRate(input.rate + step)}×`);
    },
    addBookmark: bookmark,
    toggleFocus: input.onToggleFocus,
    timecode: () => {
      if (!input.noteOpen) {
        input.setNoteOpen(true);
        toast(
          `Открыл конспект — нажми ${hotkeyLabel(timecodeHotkey)} ещё раз, чтобы вставить таймкод`,
        );
      } else {
        input.note.current?.insertTimecode();
      }
    },
    timecodeHotkey,
  });

  return { seekTo, bookmark, openVideo };
}
