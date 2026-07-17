"use client";

import type { LvInstance, LvResolvedWire } from "@/lib/modules/electrical/engine/lowVoltage";
import type { LvWireColor } from "@/lib/modules/electrical/data/lowVoltage";
import { orthoPath, type Pt } from "./ortho";

/**
 * Component diagram for a low-voltage recipe, routed schematic-style:
 * boxes in role columns (power → controller → peripherals), wires on 90°
 * channel routing through the gutters between columns; wires spanning the
 * whole diagram (supply → peripheral) run a power bus along the bottom.
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
const CH_DX = 11;

interface PinPoint extends Pt {
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
  const colOf = (ref: string) => {
    const inst = drawable.find((i) => i.ref === ref);
    if (!inst) return 2;
    return inst.component.kind === "power" ? 0 : inst.component.kind === "controller" ? 1 : 2;
  };

  // stack boxes per column
  const positions = new Map<string, { x: number; y: number; h: number }>();
  const colY = [16, 16, 16];
  for (const inst of drawable) {
    const col = colOf(inst.ref);
    const h = HEAD_H + inst.component.pins.length * PIN_GAP + 10;
    positions.set(inst.ref, { x: COL_X[col]!, y: colY[col]!, h });
    colY[col] = colY[col]! + h + 26;
  }
  const maxBottom = Math.max(...colY, 240);

  const pinPoint = (ref: string, pinId: string): PinPoint | null => {
    const inst = drawable.find((i) => i.ref === ref);
    const pos = positions.get(ref);
    if (!inst || !pos) return null;
    const idx = inst.component.pins.findIndex((p) => p.id === pinId);
    if (idx < 0) return null;
    const col = colOf(ref);
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

  // ---- routing: gutter channels + bottom bus --------------------------------
  const G1_X0 = 226; // gutter between power and controller columns
  const G2_X0 = 502; // gutter between controller and peripheral columns
  let g1Count = 0;
  let g2Count = 0;
  let busCount = 0;

  const routes = wires.map((w) => {
    const a = pinPoint(w.from.ref, w.from.pin);
    const b = pinPoint(w.to.ref, w.to.pin);
    if (!a || !b) return { w, pts: null as Pt[] | null };
    const exitA: Pt = { x: a.x + (a.side === "right" ? 6 : -6), y: a.y };
    const exitB: Pt = { x: b.x + (b.side === "right" ? 6 : -6), y: b.y };
    const pair = [colOf(w.from.ref), colOf(w.to.ref)].sort() as [number, number];

    let pts: Pt[];
    if (pair[0] === 0 && pair[1] === 2) {
      // full-span: down a g1 channel, along the bottom bus, up a g2 channel
      const g1 = G1_X0 + g1Count++ * CH_DX;
      const g2 = G2_X0 + g2Count++ * CH_DX;
      const busY = maxBottom + 14 + busCount++ * 12;
      pts = [exitA, { x: g1, y: exitA.y }, { x: g1, y: busY }, { x: g2, y: busY }, { x: g2, y: exitB.y }, exitB];
    } else {
      const useG1 = pair[1] <= 1;
      const chX = useG1 ? G1_X0 + g1Count++ * CH_DX : G2_X0 + g2Count++ * CH_DX;
      pts = [exitA, { x: chX, y: exitA.y }, { x: chX, y: exitB.y }, exitB];
    }
    return { w, pts };
  });

  const H = maxBottom + 14 + busCount * 12 + 20;
  const W = 800;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Low-voltage wiring diagram">
      {routes.map(({ w, pts }) => {
        if (!pts) return null;
        const color = LV_WIRE_COLORS[w.color];
        const d = orthoPath(pts, 7);
        const dim = activeWire !== null && activeWire !== w.step;
        return (
          <g key={w.step} opacity={dim ? 0.2 : 1}>
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
