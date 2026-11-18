import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface CardRowProps {
  title: string;
  /** Optional badge right after the title (e.g. a count). */
  badge?: ReactNode;
  children: ReactNode;
}

/** A titled row of cards that scrolls sideways, like the rows on the mockup. */
export function CardRow({ title, badge, children }: CardRowProps) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollByPage(direction: 1 | -1) {
    const element = scroller.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * element.clientWidth * 0.9,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <section aria-label={title} className="mt-12">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        {badge}
        <div className="ml-auto hidden gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Прокрутить назад"
            onClick={() => scrollByPage(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Прокрутить вперёд"
            onClick={() => scrollByPage(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div
        ref={scroller}
        className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0 [&>*]:w-[260px] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[300px]"
      >
        {children}
      </div>
    </section>
  );
}
