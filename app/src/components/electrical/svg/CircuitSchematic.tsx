"use client";

import type { SchematicModel, SchematicNode } from "@/lib/modules/electrical/types";

/**
 * Whole-circuit line diagram: panel at left, one row per circuit,
 * devices chained left→right with cable-type edge labels.
 */

const NODE_W = 132;
const NODE_H = 52;
const COL_GAP = 172;
const ROW_GAP = 96;

export function CircuitSchematic({
  model,
  selectedDeviceId,
  onSelectDevice,
}: {
  model: SchematicModel;
  selectedDeviceId?: string | null;
  onSelectDevice?: (deviceId: string) => void;
}) {
  const circuits = [...new Set(model.nodes.filter((n) => n.circuitId).map((n) => n.circuitId!))];
  if (circuits.length === 0) {
    return <p className="bp-dim p-4 text-sm text-bp-line-soft">Add a circuit to see the schematic.</p>;
  }

  // position map: panel at far left, then per-circuit rows in node order
  const pos = new Map<string, { x: number; y: number }>();
  let maxCols = 0;
  circuits.forEach((circuitId, row) => {
    const rowNodes = model.nodes.filter((n) => n.circuitId === circuitId);
    rowNodes.forEach((n, col) => {
      pos.set(n.id, { x: 40 + (col + 1) * COL_GAP, y: 26 + row * ROW_GAP });
    });
    maxCols = Math.max(maxCols, rowNodes.length);
  });
  const H = 26 + circuits.length * ROW_GAP + 10;
  const W = 60 + (maxCols + 1) * COL_GAP + 20;
  const panelY = H / 2 - NODE_H / 2 - 8;
  pos.set("panel", { x: 16, y: panelY });

  const nodeFill = (n: SchematicNode) =>
    n.kind === "panel"
      ? "var(--bp-paper-raised)"
      : n.kind === "breaker"
        ? "rgba(244,162,97,0.14)"
        : n.kind === "fixture"
          ? "transparent"
          : "var(--bp-paper-deep)";

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" role="img" aria-label="Circuit schematic">
      {model.edges.map((e, i) => {
        const from = pos.get(e.from);
        const to = pos.get(e.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const midX = (x1 + x2) / 2;
        return (
          <g key={i}>
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--bp-line-faint)"
              strokeWidth={2}
            />
            <text
              x={midX}
              y={(y1 + y2) / 2 - 7}
              fontSize={10}
              textAnchor="middle"
              fill="var(--bp-accent)"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {e.cable}
            </text>
          </g>
        );
      })}

      {model.nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        const selected = n.deviceId !== undefined && n.deviceId === selectedDeviceId;
        const clickable = n.deviceId !== undefined && onSelectDevice !== undefined;
        return (
          <g
            key={n.id}
            onClick={clickable ? () => onSelectDevice!(n.deviceId!) : undefined}
            style={clickable ? { cursor: "pointer" } : undefined}
          >
            <rect
              x={p.x}
              y={p.y}
              width={NODE_W}
              height={NODE_H}
              rx={6}
              fill={nodeFill(n)}
              stroke={selected ? "var(--bp-accent)" : "var(--bp-line-faint)"}
              strokeWidth={selected ? 2.5 : 1.5}
              strokeDasharray={n.kind === "fixture" ? "5 4" : undefined}
            />
            <text
              x={p.x + NODE_W / 2}
              y={p.y + 21}
              fontSize={11.5}
              textAnchor="middle"
              fill="var(--bp-line)"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {n.label.length > 19 ? `${n.label.slice(0, 18)}…` : n.label}
            </text>
            {n.sub && (
              <text
                x={p.x + NODE_W / 2}
                y={p.y + 38}
                fontSize={9}
                textAnchor="middle"
                fill="var(--bp-line-soft)"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {n.sub.length > 24 ? `${n.sub.slice(0, 23)}…` : n.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
