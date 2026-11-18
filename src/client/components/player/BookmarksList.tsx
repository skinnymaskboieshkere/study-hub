import { BookmarkPlus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAddBookmark, useBookmarks, useDeleteBookmark } from "@/app/queries";
import { Timecode } from "@/components/Timecode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimecode } from "@/lib/format";

interface BookmarksListProps {
  youtubeId: string;
  currentTime: () => number;
  onSeek: (seconds: number) => void;
}

/** Quick marks inside the video (SPEC §6.2); a click seeks the player. */
export function BookmarksList({ youtubeId, currentTime, onSeek }: BookmarksListProps) {
  const bookmarks = useBookmarks(youtubeId);
  const add = useAddBookmark(youtubeId);
  const remove = useDeleteBookmark(youtubeId);
  const [label, setLabel] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const tSec = currentTime();
    add.mutate(
      { tSec, label: label.trim() || `Закладка ${formatTimecode(tSec)}` },
      {
        onSuccess: () => setLabel(""),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Подпись закладки"
          aria-label="Подпись закладки"
          maxLength={200}
        />
        <Button type="submit" disabled={add.isPending}>
          <BookmarkPlus aria-hidden />
          Добавить
        </Button>
      </form>

      {bookmarks.data && bookmarks.data.length > 0 ? (
        <ul className="space-y-1">
          {bookmarks.data.map((bookmark) => (
            <li
              key={bookmark.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2"
            >
              <Timecode seconds={bookmark.tSec} onSeek={onSeek} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{bookmark.label}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Удалить закладку «${bookmark.label}»`}
                onClick={() => remove.mutate(bookmark.id)}
                className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-sm text-ink-muted">
          Нажми{" "}
          <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">B</kbd> во
          время просмотра — закладка запомнит момент.
        </p>
      )}
    </div>
  );
}
