"use client";

import type { LvInstance, LvResolvedWire } from "@/lib/modules/electrical/engine/lowVoltage";
import type { LvWireColor } from "@/lib/modules/electrical/data/lowVoltage";

/**
 * Component-style diagram for a low-voltage recipe: boxes with labeled
 * pins, columns by role (power → controller → peripherals), colored
 * jumper wires between pin dots.
 */

const LV_WIRE_COLORS: Record<LvWireColor, { stroke: string; halo?: string }> = {
  red: { stroke: "var(--wire-red)" },
  black: { stroke: "var(--wire-black)", halo: "var(--wire-black-halo)" },
  yellow: { stroke: "#e3c84b" },
  green: { stroke: "var(--wire-green)" },
  blue: { stroke: "#3b82f6" },
  white: { stroke: "var(--wire-white)", halo: "var(--wire-white-halo)" },
};

const COL_X = [24, 300, 576];
const BOX_W = 190;
const PIN_GAP = 24;
const HEAD_H = 30;

interface PinPoint {
  x: number;
  y: number;
  side: "left" | "right";
}

export function LvDiagram({
  instances,
  wires,
  activeWire,
}: {
  instances: LvInstance[];
  wires: LvResolvedWire[];
  activeWire: number | null;
}) {
  const drawable = instances.filter((i) => i.component.pins.length > 0);
  const colOf = (i: LvInstance) =>
    i.component.kind === "power" ? 0 : i.component.kind === "controller" ? 1 : 2;

  // stack boxes per column
  const positions = new Map<string, { x: number; y: number; h: number }>();
  const colY = [16, 16, 16];
  for (const inst of drawable) {
    const col = colOf(inst);
    const h = HEAD_H + inst.component.pins.length * PIN_GAP + 10;
    positions.set(inst.ref, { x: COL_X[col]!, y: colY[col]!, h });
    colY[col] = colY[col]! + h + 26;
  }
  const H = Math.max(...colY, 260) + 8;
  const W = 800;

  const pinPoint = (ref: string, pinId: string): PinPoint | null => {
    const inst = drawable.find((i) => i.ref === ref);
    const pos = positions.get(ref);
    if (!inst || !pos) return null;
    const idx = inst.component.pins.findIndex((p) => p.id === pinId);
    if (idx < 0) return null;
    const col = colOf(inst);
    const pin = inst.component.pins[idx]!;
    const side: "left" | "right" =
      col === 0
        ? "right"
        : col === 1
          ? pin.role === "gpio" || pin.role === "power-out"
            ? "right"
            : "left"
          : "left";
    return {
      x: pos.x + (side === "right" ? BOX_W : 0),
      y: pos.y + HEAD_H + idx * PIN_GAP + 10,
      side,
    };
  };

  const wirePath = (a: PinPoint, b: PinPoint) => {
    const ax = a.x + (a.side === "right" ? 6 : -6);
    const bx = b.x + (b.side === "right" ? 6 : -6);
    const reach = Math.max(46, Math.abs(bx - ax) * 0.4);
    const c1 = ax + (a.side === "right" ? reach : -reach);
    const c2 = bx + (b.side === "right" ? reach : -reach);
    return `M ${ax} ${a.y} C ${c1} ${a.y}, ${c2} ${b.y}, ${bx} ${b.y}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Low-voltage wiring diagram">
      {/* wires under boxes' pins but over nothing else */}
      {wires.map((w) => {
        const a = pinPoint(w.from.ref, w.from.pin);
        const b = pinPoint(w.to.ref, w.to.pin);
        if (!a || !b) return null;
        const color = LV_WIRE_COLORS[w.color];
        const d = wirePath(a, b);
        const dim = activeWire !== null && activeWire !== w.step;
        return (
          <g key={w.step} opacity={dim ? 0.22 : 1}>
            {activeWire === w.step && (
              <path d={d} fill="none" stroke="var(--bp-accent)" strokeWidth={9} opacity={0.4} />
            )}
            {color.halo && <path d={d} fill="none" stroke={color.halo} strokeWidth={5.5} />}
            <path d={d} fill="none" stroke={color.stroke} strokeWidth={3.5} strokeLinecap="round" />
          </g>
        );
      })}

      {drawable.map((inst) => {
        const pos = positions.get(inst.ref)!;
        return (
          <g key={inst.ref}>
            <rect
              x={pos.x}
              y={pos.y}
              width={BOX_W}
              height={pos.h}
              rx={8}
              fill="var(--bp-paper-raised)"
              stroke="var(--bp-line-faint)"
              strokeWidth={1.5}
            />
            <text
              x={pos.x + BOX_W / 2}
              y={pos.y + 19}
              fontSize={12}
              textAnchor="middle"
              fill="var(--bp-line)"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {inst.label.length > 26 ? `${inst.label.slice(0, 25)}…` : inst.label}
            </text>
            <line
              x1={pos.x + 8}
              y1={pos.y + HEAD_H - 4}
              x2={pos.x + BOX_W - 8}
              y2={pos.y + HEAD_H - 4}
              stroke="var(--bp-line-faint)"
            />
            {inst.component.pins.map((pin, idx) => {
              const p = pinPoint(inst.ref, pin.id)!;
              return (
                <g key={pin.id}>
                  <circle cx={p.x} cy={p.y} r={5} fill="var(--bp-paper-deep)" stroke="var(--bp-line-soft)" strokeWidth={1.5} />
                  <text
                    x={p.side === "right" ? p.x - 10 : p.x + 10}
                    y={pos.y + HEAD_H + idx * PIN_GAP + 13.5}
                    fontSize={10}
                    textAnchor={p.side === "right" ? "end" : "start"}
                    fill="var(--bp-line-soft)"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {pin.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
