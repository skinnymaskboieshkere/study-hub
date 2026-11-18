import { parseYoutubeLink } from "@shared/note-templates";
import { resolveLink } from "@shared/notes";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateNote } from "@/app/notes-queries";

export interface NoteJump {
  heading?: string | null;
  line?: number | null;
}

/** Moving around the vault: open a note, follow a link (creating the note), open a timecode. */
export function useNoteNavigation(path: string | null, paths: readonly string[]) {
  const navigate = useNavigate();
  const createNote = useCreateNote();

  const open = useCallback(
    (target: string, jump?: NoteJump) => {
      const next = new URLSearchParams({ path: target });
      if (jump?.heading) next.set("heading", jump.heading);
      if (jump?.line !== undefined && jump.line !== null) next.set("line", String(jump.line));
      void navigate(`/notes?${next.toString()}`);
    },
    [navigate],
  );

  const create = useCallback(
    (folder: string, name?: string) =>
      createNote.mutate(
        { folder, name },
        {
          onSuccess: (note) => open(note.path),
          onError: (error) => toast.error(error.message),
        },
      ),
    [createNote, open],
  );

  /** `[[Target#Heading]]`: an existing note opens, a missing one is created (like Obsidian). */
  const openLink = useCallback(
    (target: string, heading: string | null) => {
      if (!target && heading && path) return open(path, { heading });
      const resolved = resolveLink(target, paths, path ?? undefined);
      if (resolved) open(resolved, { heading });
      else create("", target.split("/").pop() ?? target);
    },
    [create, open, path, paths],
  );

  /** A timecode opens the lecture at that second (SPEC §6.6). */
  const openVideo = useCallback(
    (videoId: string, seconds: number) =>
      void navigate(`/watch/${videoId}${seconds > 0 ? `?t=${Math.floor(seconds)}` : ""}`),
    [navigate],
  );

  /** Ctrl+click on a web link in the editor; true when it was a YouTube link. */
  const openUrl = useCallback(
    (url: string) => {
      const video = parseYoutubeLink(url);
      if (video) openVideo(video.videoId, video.tSec);
      return Boolean(video);
    },
    [openVideo],
  );

  return { open, create, openLink, openVideo, openUrl };
}
