import "@xyflow/react/dist/style.css";
import type { RoadmapDto } from "@shared/api";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useMemo, useRef, useState } from "react";
import {
  initialViewport,
  layoutRoadmap,
  type ArrowKind,
  type RoadmapEdge,
  type RoadmapFlowNode,
} from "@/lib/roadmap";
import { CourseFlowNode, GoalFlowNode, TrackFlowNode } from "./RoadmapFlowNodes";

const NODE_TYPES: NodeTypes = {
  course: CourseFlowNode,
  track: TrackFlowNode,
  goal: GoalFlowNode,
};

// SVG markers take plain colors: the same values as the theme tokens.
const ARROW: Record<ArrowKind, { color: string; width: number; dash?: string; opacity: number }> = {
  met: { color: "#a78bfa", width: 1.75, opacity: 0.9 },
  unmet: { color: "#a09cb5", width: 1.5, dash: "6 5", opacity: 0.55 },
  optional: { color: "#a09cb5", width: 1.25, dash: "2 5", opacity: 0.45 },
  goal: { color: "#22d3ee", width: 2, opacity: 0.85 },
};

/** Styles an arrow; with a course under the pointer only its own arrows stay bright. */
function styled(edge: RoadmapEdge, hovered: string | null): RoadmapEdge {
  const arrow = ARROW[edge.data?.kind ?? "met"];
  const related = hovered !== null && (edge.source === hovered || edge.target === hovered);
  const dimmed = hovered !== null && !related;
  return {
    ...edge,
    style: {
      stroke: arrow.color,
      strokeWidth: related ? arrow.width + 1 : arrow.width,
      strokeDasharray: arrow.dash,
      opacity: dimmed ? 0.08 : related ? 1 : arrow.opacity,
      transition: "opacity 150ms, stroke-width 150ms",
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: arrow.color, width: 16, height: 16 },
    zIndex: related ? 1 : 0,
  };
}

/** The map of courses (SPEC §6.3): tracks as columns, arrows from prerequisites. */
export function RoadmapGraph({ roadmap }: { roadmap: RoadmapDto }) {
  const layout = useMemo(() => layoutRoadmap(roadmap), [roadmap]);
  const box = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const edges = useMemo(
    () => layout.edges.map((edge) => styled(edge, hovered)),
    [layout.edges, hovered],
  );

  // Readable from the start: fit the width (not the whole height), begin at the top left.
  function start(flow: ReactFlowInstance<RoadmapFlowNode, RoadmapEdge>) {
    const width = box.current?.clientWidth ?? 1200;
    void flow.setViewport(initialViewport(layout.nodes, width));
  }

  return (
    <div ref={box} className="size-full">
      <ReactFlow
        className="roadmap-flow"
        onInit={start}
        nodes={layout.nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        colorMode="dark"
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        // The wheel scrolls the map like a page; Ctrl+wheel and pinch zoom.
        panOnScroll
        zoomOnScroll={false}
        onNodeMouseEnter={(_, node) => setHovered(node.type === "course" ? node.id : null)}
        onNodeMouseLeave={() => setHovered(null)}
        aria-label="Карта курсов: треки по колонкам, стрелки от пререквизитов"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2a2140" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
