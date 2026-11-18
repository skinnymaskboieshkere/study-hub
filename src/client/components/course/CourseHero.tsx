import { ListVideo, Play } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { TrackSlug } from "@/app/tracks";
import { Button } from "@/components/ui/button";
import { CourseCover } from "./CourseCover";

interface CourseHeroProps {
  title: string;
  subject: string;
  university: string;
  /** Where the student is, e.g. "Лекция 3 из 11". */
  position: string;
  description: string;
  track: TrackSlug;
  shortTitle: string;
  coverVideoId?: string;
  continueTo: string;
  programTo: string;
  /** Small facts in the bottom-right corner (wide screens only). */
  badges?: ReactNode;
}

/** The current course on the home page, built after the mockup's banner. */
export function CourseHero(props: CourseHeroProps) {
  return (
    <section
      aria-labelledby="course-hero-title"
      className="relative isolate overflow-hidden rounded-3xl border border-white/5 bg-night"
    >
      <CourseCover
        videoId={props.coverVideoId}
        label={props.shortTitle}
        track={props.track}
        quality="maxresdefault"
        className="absolute inset-0 -z-10 sm:left-auto sm:w-[72%]"
      />
      {/* Fades the picture into the night on the text side and adds violet light, like the mockup. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#0a0810_42%,rgb(10_8_16/0.6)_75%,rgb(10_8_16/0.35))] sm:bg-[linear-gradient(90deg,#0a0810_30%,rgb(10_8_16/0.78)_50%,rgb(10_8_16/0.12)_85%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_90%_0%,rgb(139_92_246/0.35),transparent_70%)]"
      />

      <div className="max-w-[42rem] px-6 pt-44 pb-10 sm:px-12 sm:py-16 lg:py-20">
        <h2
          id="course-hero-title"
          className="font-display text-[clamp(2rem,4.2vw,3.5rem)] leading-[1.05] font-extrabold tracking-tight text-ink uppercase"
        >
          {props.title}
        </h2>
        <p className="mt-5 text-[17px] text-ink-muted">
          <span className="text-lilac">{props.subject}</span> • {props.university} •{" "}
          {props.position}
        </p>
        <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-ink/90">{props.description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="hero" size="pill">
            <Link to={props.continueTo}>
              <Play aria-hidden className="fill-current" />
              Продолжить обучение
            </Link>
          </Button>
          <Button asChild variant="glass" size="pill">
            <Link to={props.programTo}>
              <ListVideo aria-hidden />
              Программа курса
            </Link>
          </Button>
        </div>
      </div>

      {props.badges && (
        <div className="absolute right-5 bottom-5 hidden gap-2 lg:flex">{props.badges}</div>
      )}
    </section>
  );
}

/** Small translucent fact next to the hero's bottom edge. */
export function HeroBadge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-night/65 px-3.5 py-2 text-sm text-ink ring-1 ring-white/10 backdrop-blur-md [&_svg]:size-4 [&_svg]:text-lilac">
      {icon}
      {children}
    </span>
  );
}
