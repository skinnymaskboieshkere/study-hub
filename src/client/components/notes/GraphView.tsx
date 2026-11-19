import type { GraphData, GraphNode } from "@shared/note-links";
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-2d";
import { nodeColor, type GraphColoring } from "@/lib/graph-style";

type Node = NodeObject<GraphNode>;

interface GraphViewProps {
  graph: GraphData;
  coloring: GraphColoring;
  /** The open note: drawn with a ring and always labelled. */
  current?: string | null;
  onOpen: (node: GraphNode) => void;
  /** Labels appear from this zoom on (the local graph shows them right away). */
  labelsFrom?: number;
  className?: string;
}

const radius = (node: GraphNode) => 3 + Math.sqrt(node.degree) * 1.8;

/** Notes as dots, links as lines (SPEC §6.5): drag, zoom, hover to see the neighbours. */
export function GraphView({
  graph,
  coloring,
  current,
  onOpen,
  labelsFrom = 1.4,
  className,
}: GraphViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<Node> | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  // The canvas needs pixel sizes: follow the box.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // force-graph moves the objects it gets; a copy keeps the query data clean.
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.links.map((link) => ({ ...link })),
    }),
    [graph],
  );

  const neighbours = useMemo(() => {
    if (!hovered) return null;
    const near = new Set([hovered]);
    for (const link of graph.links) {
      if (link.source === hovered) near.add(link.target);
      if (link.target === hovered) near.add(link.source);
    }
    return near;
  }, [graph.links, hovered]);

  return (
    <div ref={box} className={className}>
      {size.width > 0 && (
        <ForceGraph2D<GraphNode>
          ref={graphRef}
          graphData={data}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeId="id"
          nodeLabel={(node) => node.title}
          cooldownTicks={120}
          onEngineStop={() => graphRef.current?.zoomToFit(300, 40)}
          linkColor={(link) => {
            const source = typeof link.source === "object" ? link.source?.id : link.source;
            const target = typeof link.target === "object" ? link.target?.id : link.target;
            const lit =
              neighbours && neighbours.has(String(source)) && neighbours.has(String(target));
            return lit ? "rgba(167,139,250,0.85)" : "rgba(160,156,181,0.28)";
          }}
          linkWidth={1}
          onNodeHover={(node) => setHovered(node ? String(node.id) : null)}
          onNodeClick={(node) => onOpen(node)}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, radius(node) + 3, 0, 2 * Math.PI);
            ctx.fill();
          }}
          nodeCanvasObject={(node, ctx, scale) => {
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const r = radius(node);
            const dimmed = neighbours !== null && !neighbours.has(String(node.id));
            ctx.globalAlpha = dimmed ? 0.25 : 1;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = nodeColor(node, coloring);
            ctx.fill();
            if (node.id === current) {
              ctx.lineWidth = 2 / scale;
              ctx.strokeStyle = "#ede9fe";
              ctx.stroke();
            }
            if (scale >= labelsFrom || node.id === current || node.id === hovered) {
              ctx.font = `${12 / scale}px "Inter Variable", system-ui, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = node.missing ? "rgba(160,156,181,0.7)" : "rgba(237,233,254,0.9)";
              ctx.fillText(node.title, x, y + r + 3 / scale);
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}
    </div>
  );
}
