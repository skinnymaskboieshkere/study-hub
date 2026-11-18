import { BookOpen, Route } from "lucide-react";
import { Link } from "react-router";
import { TrackPath } from "@/components/TrackPath";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="bg-hero relative mt-4 overflow-hidden rounded-3xl border border-white/5 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
      >
        <h1
          id="hero-title"
          className="max-w-[16ch] font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] font-extrabold tracking-tight text-ink uppercase"
        >
          Путь к Computer Vision
        </h1>
        <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-ink/85">
          Лекции MIT, Harvard, Stanford и других университетов, план на каждый день и конспекты в
          твоём Obsidian — в одном месте.
        </p>

        <TrackPath className="mt-8 max-w-3xl" />

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="hero" size="pill">
            <Link to="/courses">
              <BookOpen aria-hidden />
              Открыть каталог
            </Link>
          </Button>
          <Button asChild variant="glass" size="pill">
            <Link to="/roadmap">
              <Route aria-hidden />
              Траектории
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="today-title" className="mt-12">
        <h2 id="today-title" className="text-2xl font-semibold text-ink">
          План на сегодня
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-8">
          <p className="max-w-[60ch] text-ink-muted">
            Пока пусто. Сначала добавим курсы (этап 1), потом мастер составит план (этап 2) — и
            здесь появятся лекции на сегодня.
          </p>
        </div>
      </section>
    </>
  );
}
