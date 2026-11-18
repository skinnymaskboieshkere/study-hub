import type { WatchDto } from "@shared/api";
import { useEffect, useRef } from "react";
import { CourseProgram } from "@/components/course/CourseProgram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookmarksList } from "./BookmarksList";

interface LessonPanelProps {
  watch: WatchDto;
  currentTime: () => number;
  onSeek: (seconds: number) => void;
}

const TRIGGER =
  "rounded-full px-4 py-1.5 data-[state=active]:bg-surface-2 data-[state=active]:text-ink";

/** Side panel of the study screen: the course playlist and the bookmarks (SPEC §6.2). */
export function LessonPanel({ watch, currentTime, onSeek }: LessonPanelProps) {
  const programRef = useRef<HTMLDivElement>(null);

  // Show the current lesson without scrolling the whole page.
  useEffect(() => {
    const list = programRef.current;
    const current = list?.querySelector<HTMLElement>("[aria-current=step]");
    if (list && current) list.scrollTop = current.offsetTop - list.clientHeight / 2;
  }, [watch.video.youtubeId]);

  return (
    <aside className="rounded-2xl border border-line bg-surface p-3">
      <Tabs defaultValue="program">
        <TabsList className="h-auto w-full rounded-full border border-line bg-night p-1">
          <TabsTrigger value="program" className={TRIGGER}>
            Программа
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className={TRIGGER}>
            Закладки
          </TabsTrigger>
        </TabsList>
        <TabsContent value="program" className="mt-3">
          <div ref={programRef} className="relative max-h-[min(70vh,640px)] overflow-y-auto pr-1">
            <CourseProgram
              compact
              courseSlug={watch.course.slug}
              units={watch.course.units}
              currentYoutubeId={watch.video.youtubeId}
            />
          </div>
        </TabsContent>
        <TabsContent value="bookmarks" className="mt-3 px-1">
          <BookmarksList
            youtubeId={watch.video.youtubeId}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
