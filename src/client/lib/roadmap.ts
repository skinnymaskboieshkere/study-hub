import type { RoadmapDto, RoadmapNodeDto } from "@shared/api";
import type { RoadmapState } from "@shared/roadmap";
import type { Edge, Node } from "@xyflow/react";
import { formatPercent, pluralRu } from "./format";

/** Size of a course card on the map; the custom node renders exactly this width. */
export const NODE_WIDTH = 232;
export const COLUMN_GAP = 104;
export const ROW_HEIGHT = 176;
const HEADER_Y = -84;

export type CourseNode = Node<{ course: RoadmapNodeDto }, "course">;
export type TrackNode = Node<{ title: string; slug: RoadmapNodeDto["track"] }, "track">;
export type GoalNode = Node<{ hoursLeft: number }, "goal">;
export type RoadmapFlowNode = CourseNode | TrackNode | GoalNode;

/** met: the prerequisite reached its share; optional: "желательно". */
export type ArrowKind = "met" | "unmet" | "optional" | "goal";
export type RoadmapEdge = Edge<{ kind: ArrowKind }>;

/**
 * Places the courses (SPEC §6.3): one column per track in path order, courses top to bottom
 * by their order, arrows from prerequisite to course. Arrows inside a column run along its
 * left side so they do not cut through the cards. The goal sits after the CV column and
 * gathers the CV courses nothing else in the track builds on.
 */
export function layoutRoadmap(roadmap: RoadmapDto): {
  nodes: RoadmapFlowNode[];
  edges: RoadmapEdge[];
} {
  const tracks = [...roadmap.tracks].sort((a, b) => a.order - b.order);
  const column = new Map(tracks.map((track, index) => [track.slug, index]));
  const bySlug = new Map(roadmap.nodes.map((node) => [node.slug, node]));
  const x = (index: number) => index * (NODE_WIDTH + COLUMN_GAP);

  const nodes: RoadmapFlowNode[] = tracks.map((track, index) => ({
    id: `track:${track.slug}`,
    type: "track",
    position: { x: x(index), y: HEADER_Y },
    data: { title: track.title, slug: track.slug },
    draggable: false,
    selectable: false,
    focusable: false,
  }));

  const rows = new Map<string, number>();
  for (const track of tracks) {
    const courses = roadmap.nodes
      .filter((node) => node.track === track.slug)
      .sort((a, b) => a.order - b.order);
    courses.forEach((course, row) => {
      rows.set(course.slug, row);
      nodes.push({
        id: course.slug,
        type: "course",
        position: { x: x(column.get(track.slug) ?? 0), y: row * ROW_HEIGHT },
        data: { course },
        draggable: false,
        selectable: false,
      });
    });
  }

  const edges: RoadmapEdge[] = [];
  for (const course of roadmap.nodes) {
    for (const prerequisite of course.prerequisites) {
      const from = bySlug.get(prerequisite.slug);
      if (!from) continue;
      const sameColumn = from.track === course.track;
      const kind: ArrowKind =
        from.progress >= prerequisite.minProgress
          ? "met"
          : prerequisite.optional
            ? "optional"
            : "unmet";
      edges.push({
        id: `${prerequisite.slug}->${course.slug}`,
        source: prerequisite.slug,
        target: course.slug,
        sourceHandle: sameColumn ? "side-out" : "out",
        targetHandle: sameColumn ? "side-in" : "in",
        type: sameColumn ? "smoothstep" : "default",
        data: { kind },
      });
    }
  }

  const cv = roadmap.nodes.filter((node) => node.track === "cv");
  if (cv.length > 0) {
    const cvColumn = column.get("cv") ?? tracks.length - 1;
    const middleRow = (cv.length - 1) / 2;
    nodes.push({
      id: "goal",
      type: "goal",
      position: { x: x(cvColumn + 1), y: middleRow * ROW_HEIGHT },
      data: { hoursLeft: roadmap.hoursLeft },
      draggable: false,
      selectable: false,
    });
    const builtOn = new Set(
      cv.flatMap((node) =>
        node.prerequisites
          .filter((item) => bySlug.get(item.slug)?.track === "cv")
          .map((item) => item.slug),
      ),
    );
    for (const node of cv.filter((item) => !builtOn.has(item.slug))) {
      edges.push({
        id: `${node.slug}->goal`,
        source: node.slug,
        target: "goal",
        sourceHandle: "out",
        targetHandle: "in",
        data: { kind: "goal" },
      });
    }
  }
  return { nodes, edges };
}

const PADDING = 24;

/**
 * Where the map opens: zoomed so the whole width fits (between 0.6 and 1, so the cards stay
 * readable on a narrow window), with the track titles at the top left.
 */
export function initialViewport(
  nodes: RoadmapFlowNode[],
  width: number,
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) return { x: PADDING, y: PADDING, zoom: 1 };
  const left = Math.min(...nodes.map((node) => node.position.x));
  const right = Math.max(...nodes.map((node) => node.position.x)) + NODE_WIDTH;
  const top = Math.min(...nodes.map((node) => node.position.y));
  const zoom = Math.min(1, Math.max(0.6, (width - 2 * PADDING) / (right - left)));
  return { x: PADDING - left * zoom, y: PADDING - top * zoom, zoom };
}

/**
 * The node's hint (SPEC §6.3): "Рекомендуется сначала пройти 18.06 — сейчас 40% из 60%".
 * One line per missing prerequisite; "желательно" ones say so.
 */
export function missingHint(missing: RoadmapNodeDto["missing"]): string[] {
  return missing.map((item) => {
    const numbers = `сейчас ${formatPercent(item.progress)} из ${formatPercent(item.minProgress)}`;
    return item.optional
      ? `Желательно сначала пройти ${item.shortTitle} — ${numbers}`
      : `Рекомендуется сначала пройти ${item.shortTitle} — ${numbers}`;
  });
}

export const STATE_LABEL: Record<RoadmapState, string> = {
  available: "Можно начинать",
  wait: "Лучше подождать",
  "in-progress": "В процессе",
  done: "Пройден",
};

/**
 * The card title with the course code in front, said once: "CS50x: Introduction…" keeps its
 * own "CS50x", "Linear Algebra" becomes "18.06 · Linear Algebra".
 */
export function splitTitle(shortTitle: string, title: string): { lead: string; rest: string } {
  if (!title.toLowerCase().startsWith(shortTitle.toLowerCase()))
    return { lead: shortTitle, rest: ` · ${title}` };
  // The code may go on in the title: "18.06" → "18.06SC", "EECS 498" → "EECS 498-007".
  const tail = /^[^\s:]*/.exec(title.slice(shortTitle.length))?.[0] ?? "";
  const end = shortTitle.length + tail.length;
  return { lead: title.slice(0, end), rest: title.slice(end) };
}

/** "~42 часа" — whole hours, at least one while anything is left. */
export function formatHoursLeft(hours: number): string {
  const whole = hours > 0 ? Math.max(1, Math.round(hours)) : 0;
  return `~${whole} ${pluralRu(whole, ["час", "часа", "часов"])}`;
}
