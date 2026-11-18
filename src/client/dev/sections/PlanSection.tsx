import type { PlanItemDto, TodayDto } from "@shared/api";
import { SUBJECTS } from "@shared/catalog";
import { CalendarPart, SubjectLegend } from "@/components/calendar/CalendarPart";
import { SegmentPanel } from "@/components/player/SegmentPanel";
import { CvProgressCard } from "@/components/today/CvProgressCard";
import { WeekStrip } from "@/components/today/WeekStrip";
import { SAMPLE_VIDEO } from "../sample";
import { ShowcaseGroup, ShowcaseSection } from "../ShowcaseSection";

const PART: PlanItemDto = {
  id: 1,
  date: "2026-11-18",
  status: "planned",
  courseSlug: "cs50x",
  courseShortTitle: "CS50x",
  track: "foundation",
  subject: "programming",
  youtubeId: SAMPLE_VIDEO.cs50xLecture0,
  coverVideoId: SAMPLE_VIDEO.cs50xLecture0,
  lessonTitle: "Лекция 0 — Scratch",
  kind: "lecture",
  startSec: 0,
  endSec: 1800,
  videoDurationSec: 7200,
  embeddable: true,
  language: "en",
};

const PARTS: PlanItemDto[] = [
  PART,
  {
    ...PART,
    id: 2,
    status: "done",
    courseSlug: "mit-18-01",
    courseShortTitle: "18.01",
    subject: "math",
    lessonTitle: "Лекция 1 — Rate of Change",
  },
  {
    ...PART,
    id: 3,
    courseSlug: "yale-phys-200",
    courseShortTitle: "PHYS 200",
    subject: "physics",
    lessonTitle: "Лекция 2 — Vectors in Multiple Dimensions",
    endSec: 1418,
  },
];

const WEEK: TodayDto["week"] = [
  { date: "2026-11-16", plannedSec: 3600, doneSec: 3600, tracks: ["foundation"] },
  { date: "2026-11-17", plannedSec: 3600, doneSec: 1800, tracks: ["foundation"] },
  { date: "2026-11-18", plannedSec: 3600, doneSec: 0, tracks: ["foundation"] },
  { date: "2026-11-19", plannedSec: 2700, doneSec: 0, tracks: ["foundation", "engineering"] },
  { date: "2026-11-20", plannedSec: 3600, doneSec: 0, tracks: ["foundation"] },
  { date: "2026-11-21", plannedSec: 0, doneSec: 0, tracks: [] },
  { date: "2026-11-22", plannedSec: 0, doneSec: 0, tracks: [] },
];

const CV: TodayDto["cv"] = {
  hoursLeft: 214,
  tracks: [
    { slug: "foundation", title: "Фундамент", color: "#a78bfa", share: 0.18 },
    { slug: "engineering", title: "Инженерная база", color: "#60a5fa", share: 0.04 },
    { slug: "robotics", title: "Робототехника", color: "#34d399", share: 0 },
    { slug: "cv", title: "Computer Vision", color: "#22d3ee", share: 0 },
  ],
};

export function PlanSection() {
  return (
    <ShowcaseSection
      id="plan"
      title="План и календарь"
      description="Части лекций на день, неделя, путь к CV и календарь. Цвет части в календаре — цвет предмета."
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <WeekStrip week={WEEK} today="2026-11-18" />
        <CvProgressCard cv={CV} />
      </div>

      <ShowcaseGroup title="Часть плана в плеере">
        <SegmentPanel
          segment={{ itemId: 1, fromSec: 2700, toSec: 5400 }}
          done={false}
          currentTime={() => 3900}
          onMarkDone={() => undefined}
          focus={false}
        />
      </ShowcaseGroup>

      <ShowcaseGroup title="Предметы и части в календаре">
        <SubjectLegend subjects={[...SUBJECTS]} />
        <ul className="mt-5 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
          {PARTS.map((part) => (
            <li key={part.id}>
              <CalendarPart item={part} />
            </li>
          ))}
        </ul>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
