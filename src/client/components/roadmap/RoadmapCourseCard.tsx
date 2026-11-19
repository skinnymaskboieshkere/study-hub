import type { RoadmapNodeDto } from "@shared/api";
import { CalendarCheck, CalendarPlus, VideoOff } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { missingHint, splitTitle } from "@/lib/roadmap";
import { RoadmapNode } from "./RoadmapNode";

/** A small icon with a hover hint; the label is read out by screen readers. */
function Marker({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="img" aria-label={label} className="relative z-10 shrink-0 text-ink-muted">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function PlanAction({ course }: { course: RoadmapNodeDto }) {
  if (course.state === "done") return null;
  if (course.status === "candidate")
    return (
      <Marker label="Видео ещё не импортированы: открой курс">
        <VideoOff aria-hidden className="size-4" />
      </Marker>
    );
  if (course.inPlan)
    return (
      <Marker label="Уже в плане">
        <CalendarCheck aria-hidden className="size-4 text-lilac" />
      </Marker>
    );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="icon-xs"
          variant="secondary"
          // Above the card-wide link, so the button gets its own clicks.
          className="relative z-10 bg-brand/20 text-ink hover:bg-brand/40"
        >
          <Link
            to={`/plan?add=${encodeURIComponent(course.slug)}`}
            aria-label={`Добавить ${course.shortTitle} в план`}
          >
            <CalendarPlus aria-hidden className="size-3.5" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Добавить в план</TooltipContent>
    </Tooltip>
  );
}

/**
 * A course card of the roadmap: the whole card opens the course, "В план" opens the plan
 * wizard with it ticked, hovering or focusing shows what is still missing (SPEC §6.3).
 */
export function RoadmapCourseCard({ course }: { course: RoadmapNodeDto }) {
  const hint = missingHint(course.missing);
  const title = splitTitle(course.shortTitle, course.title);
  const link = (
    <Link
      to={`/courses/${encodeURIComponent(course.slug)}`}
      // The link covers the card (::after), so a click anywhere opens the course.
      className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-lilac"
    >
      <span className="text-lilac">{title.lead}</span>
      {title.rest}
    </Link>
  );
  return (
    <RoadmapNode
      title={course.title}
      university={course.university}
      track={course.track}
      state={course.state}
      progress={course.progress}
      hours={course.hours}
      titleSlot={
        hint.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72">
              {hint.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        ) : (
          link
        )
      }
      action={<PlanAction course={course} />}
      className="h-36"
    />
  );
}
