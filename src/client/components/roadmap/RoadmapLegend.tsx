import { STATE_LABEL } from "@/lib/roadmap";
import { StateIcon, type RoadmapNodeState } from "./RoadmapNode";

const STATES: RoadmapNodeState[] = ["available", "wait", "in-progress", "done"];

/** What colors, icons and arrows mean on the roadmap. */
export function RoadmapLegend() {
  return (
    <ul
      aria-label="Обозначения"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted"
    >
      {STATES.map((state) => (
        <li key={state} className="flex items-center gap-2">
          <StateIcon state={state} progress={0.4} />
          {STATE_LABEL[state]}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <svg aria-hidden width="28" height="6" className="text-lilac">
          <line x1="0" y1="3" x2="28" y2="3" stroke="currentColor" strokeWidth="2" />
        </svg>
        пререквизит пройден
      </li>
      <li className="flex items-center gap-2">
        <svg aria-hidden width="28" height="6">
          <line
            x1="0"
            y1="3"
            x2="28"
            y2="3"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
        </svg>
        ещё нет
      </li>
      <li className="flex items-center gap-2">
        <svg aria-hidden width="28" height="6">
          <line
            x1="0"
            y1="3"
            x2="28"
            y2="3"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="2 5"
          />
        </svg>
        желательно
      </li>
    </ul>
  );
}
