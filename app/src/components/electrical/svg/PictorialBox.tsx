"use client";

import type { DevicePlan, ResolvedConductor } from "@/lib/modules/electrical/types";
import { CABLES } from "@/lib/modules/electrical/data/conductors";
import { deviceConfig, deviceSpec } from "@/lib/modules/electrical/data/devices";
import { formatIn3 } from "@/lib/modules/electrical/data/boxes";
import { GLYPHS } from "./deviceGlyphs";
import {
  ROLE_LABELS,
  SCREW_COLORS,
  SHEATH_COLORS,
  WIRENUT_COLORS,
  WIRE_COLORS,
} from "../palette";

/**
 * Pictorial "inside the box" wiring diagram for one device plan.
 * Conductors route from cable entries (left) through the splice zone to
 * screw terminals / leads on the device glyph (right). `activeStep`
 * highlights one make-up step; null shows everything.
 */

interface Point {
  x: number;
  y: number;
}

function wirePath(s: Point, e: Point): string {
  const reach = Math.max(60, Math.abs(e.x - s.x) * 0.45);
  return `M ${s.x} ${s.y} C ${s.x + reach} ${s.y}, ${e.x - reach} ${e.y}, ${e.x} ${e.y}`;
}

function WireNutShape({ x, y, size, active }: { x: number; y: number; size: string; active: boolean }) {
  const fill = WIRENUT_COLORS[size] ?? "#9aa7b4";
  return (
    <g>
      {active && (
        <circle cx={x} cy={y} r={20} fill="none" stroke="var(--bp-accent)" strokeWidth={2} strokeDasharray="4 3" />
      )}
      <path
        d={`M ${x - 11} ${y + 12} L ${x + 11} ${y + 12} L ${x + 6} ${y - 9} Q ${x} ${y - 15} ${x - 6} ${y - 9} Z`}
        fill={fill}
        stroke="rgba(10,33,56,0.7)"
        strokeWidth={1.4}
      />
      <path d={`M ${x - 6} ${y + 2} L ${x + 6} ${y - 1} M ${x - 7} ${y + 7} L ${x + 7} ${y + 4}`} stroke="rgba(10,33,56,0.55)" strokeWidth={1.2} fill="none" />
    </g>
  );
}

export function PictorialBox({
  plan,
  activeStep,
}: {
  plan: DevicePlan;
  activeStep: number | null;
}) {
  const spec = deviceSpec(plan.kind);
  const config = deviceConfig(plan.kind, plan.configId);
  const glyph = GLYPHS[plan.kind];
  if (!spec || !config || !glyph) return null;

  const terminals = config.terminalsOverride ?? spec.terminals;
  const W = 780;
  const H = Math.max(400, plan.cables.length * 132 + 120, glyph.h + 190);
  const gx = W - glyph.w - 118;
  const gy = (H - glyph.h) / 2 - 8;

  const termPoint = (terminalId: string): Point | null => {
    const t = glyph.terminals[terminalId];
    if (!t) return null;
    return { x: gx + t.x, y: gy + t.y };
  };

  // ---- geometry: cable entries + conductor starts ---------------------------
  const entryYs = plan.cables.map((_, i) =>
    plan.cables.length === 1
      ? H / 2 - 10
      : 96 + i * ((H - 200) / (plan.cables.length - 1)),
  );
  const starts = new Map<string, Point>();
  plan.cables.forEach((cable, ci) => {
    cable.conductors.forEach((wire, wi) => {
      const spread = (wi - (cable.conductors.length - 1) / 2) * 14;
      starts.set(wire.id, { x: 70, y: entryYs[ci]! + spread });
    });
  });

  // ---- geometry: wire nuts ----------------------------------------------------
  const leadNutOf = (terminalId: string) =>
    plan.wirenuts.find((n) => n.id === `${plan.deviceId}.WN-L-${terminalId}`);
  const groupNuts = plan.wirenuts.filter((n) => !n.id.includes(".WN-L-"));
  const nutPos = new Map<string, Point>();
  groupNuts.forEach((n, i) => {
    nutPos.set(n.id, { x: 350, y: 78 + i * 58 });
  });
  for (const t of terminals) {
    const nut = leadNutOf(t.id);
    const p = termPoint(t.id);
    if (nut && p) nutPos.set(nut.id, { x: p.x - 44, y: p.y });
  }

  // ---- per-conductor endpoints + step index ------------------------------------
  const ends = new Map<string, Point>();
  const stepOf = new Map<string, number>();
  const activePrep =
    activeStep !== null &&
    plan.connections.some((c) => c.step === activeStep && c.target.kind === "prep");

  for (const conn of plan.connections) {
    for (const [idx, wireId] of conn.conductorIds.entries()) {
      stepOf.set(wireId, conn.step);
      if (conn.target.kind === "terminal") {
        const nut = leadNutOf(conn.target.terminalId);
        const p = nut ? nutPos.get(nut.id) : termPoint(conn.target.terminalId);
        if (p)
          ends.set(wireId, {
            x: p.x + (nut ? -8 : -10),
            y: p.y + (conn.conductorIds.length > 1 ? (idx - (conn.conductorIds.length - 1) / 2) * 10 : 0),
          });
      } else if (conn.target.kind === "wirenut") {
        const p = nutPos.get(conn.target.wirenutId);
        if (p)
          ends.set(wireId, {
            x: p.x - 10 + idx * 8,
            y: p.y + 13,
          });
      }
    }
  }

  const conductorList: { wire: ResolvedConductor; s: Point; e: Point; step: number }[] = [];
  for (const cable of plan.cables) {
    for (const wire of cable.conductors) {
      const s = starts.get(wire.id);
      const e = ends.get(wire.id);
      const step = stepOf.get(wire.id);
      if (s && e && step !== undefined) conductorList.push({ wire, s, e, step });
    }
  }

  const dim = (step: number) => activeStep !== null && step !== activeStep;
  const lit = (step: number) => activeStep !== null && step === activeStep;

  const rolesPresent = [...new Set(conductorList.map((c) => c.wire.role))];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Wiring diagram: ${plan.displayName}`} className="w-full">
        {/* the box */}
        <rect x={4} y={30} width={W - 8} height={H - 66} rx={10} fill="var(--elec-box-fill)" stroke="var(--bp-line-faint)" strokeWidth={2} />
        <text x={18} y={20} fontSize={13} fill="var(--bp-line)" style={{ fontFamily: "var(--font-geist-mono)" }}>
          {plan.displayName} — {plan.configLabel}
        </text>
        <text
          x={W - 14}
          y={H - 12}
          fontSize={11}
          textAnchor="end"
          fill={plan.boxFill.pass ? "var(--bp-line-soft)" : "var(--bp-danger)"}
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {plan.boxFill.boxLabel} · fill {formatIn3(plan.boxFill.totalFill)} / {formatIn3(plan.boxFill.capacity)}
          {plan.boxFill.pass ? "" : " — OVERFILLED"}
        </text>

        {/* cable entries */}
        {plan.cables.map((cable, i) => {
          const y = entryYs[i]!;
          const sheath = SHEATH_COLORS[CABLES[cable.type].sheathColor] ?? "#dbe7f3";
          return (
            <g key={cable.role}>
              <rect x={0} y={y - 15} width={66} height={30} rx={6} fill={sheath} stroke="rgba(10,33,56,0.6)" />
              <text x={8} y={y - 22} fontSize={10.5} fill="var(--bp-line-soft)" style={{ fontFamily: "var(--font-geist-mono)" }}>
                {cable.label}
              </text>
            </g>
          );
        })}

        {/* conductors */}
        {conductorList.map(({ wire, s, e, step }) => {
          const color = WIRE_COLORS[wire.color];
          const d = wirePath(s, e);
          return (
            <g key={wire.id} opacity={dim(step) ? 0.24 : 1}>
              {lit(step) && <path d={d} fill="none" stroke="var(--bp-accent)" strokeWidth={10} opacity={0.4} />}
              {color.halo && <path d={d} fill="none" stroke={color.halo} strokeWidth={6.5} />}
              <path d={d} fill="none" stroke={color.stroke} strokeWidth={wire.color === "bare" ? 3.4 : 4.5} strokeLinecap="round" />
              {wire.reidentifiedTo && (
                <>
                  <rect x={s.x + 22} y={s.y - 5.5} width={17} height={11} rx={2.5} fill={WIRE_COLORS[wire.reidentifiedTo].stroke} stroke="rgba(10,33,56,0.6)" />
                  <rect x={e.x - 40} y={e.y - 5.5} width={17} height={11} rx={2.5} fill={WIRE_COLORS[wire.reidentifiedTo].stroke} stroke="rgba(10,33,56,0.6)" />
                </>
              )}
            </g>
          );
        })}

        {/* pigtails from group nuts to terminals */}
        {groupNuts.map((nut) => {
          if (!nut.pigtail) return null;
          const from = nutPos.get(nut.id);
          const to = termPoint(nut.pigtail.toTerminalId);
          if (!from || !to) return null;
          const color = WIRE_COLORS[nut.pigtail.color];
          const step = plan.connections.find(
            (c) => c.target.kind === "wirenut" && c.target.wirenutId === nut.id,
          )?.step;
          const d = wirePath({ x: from.x + 10, y: from.y + 8 }, { x: to.x - 10, y: to.y });
          return (
            <g key={`pig-${nut.id}`} opacity={step !== undefined && dim(step) ? 0.24 : 1}>
              {color.halo && <path d={d} fill="none" stroke={color.halo} strokeWidth={6} />}
              <path d={d} fill="none" stroke={color.stroke} strokeWidth={4} strokeLinecap="round" strokeDasharray="7 4" />
            </g>
          );
        })}

        {/* lead stubs from device edge out to their splice nuts */}
        {terminals.map((t) => {
          const nut = leadNutOf(t.id);
          const p = termPoint(t.id);
          const np = nut ? nutPos.get(nut.id) : null;
          if (!nut || !p || !np) return null;
          return (
            <line
              key={`lead-${t.id}`}
              x1={p.x}
              y1={p.y}
              x2={np.x + 6}
              y2={np.y}
              stroke={SCREW_COLORS[t.screw] ?? "var(--bp-line-soft)"}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}

        {/* device body + terminals */}
        <g transform={`translate(${gx} ${gy})`}>
          <glyph.Body prepActive={activePrep} />
        </g>
        {terminals.map((t) => {
          const p = termPoint(t.id);
          if (!p || leadNutOf(t.id)) return null;
          const gt = glyph.terminals[t.id];
          const active =
            activeStep !== null &&
            plan.connections.some(
              (c) => c.step === activeStep && c.target.kind === "terminal" && c.target.terminalId === t.id,
            );
          const labelRight = gt?.side === "right";
          // short form — the full label lives in the Connections tab
          const shortLabel = t.label.split(" (")[0]!;
          return (
            <g key={t.id}>
              {active && <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="var(--bp-accent)" strokeWidth={2} strokeDasharray="4 3" />}
              <circle cx={p.x} cy={p.y} r={7} fill={SCREW_COLORS[t.screw] ?? "#c9d4df"} stroke="rgba(10,33,56,0.7)" strokeWidth={1.5} />
              <line x1={p.x - 4.5} y1={p.y} x2={p.x + 4.5} y2={p.y} stroke="rgba(10,33,56,0.8)" strokeWidth={1.6} />
              <text
                x={labelRight ? p.x + 13 : gt?.side === "left" ? p.x - 12 : p.x}
                y={gt?.side === "bottom" ? p.y + 19 : gt?.side === "top" ? p.y - 12 : gt?.side === "left" ? p.y - 12 : p.y + 3.5}
                fontSize={9.5}
                textAnchor={labelRight ? "start" : gt?.side === "left" ? "end" : "middle"}
                fill={active ? "var(--bp-accent)" : "var(--bp-line-soft)"}
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {shortLabel}
              </text>
            </g>
          );
        })}

        {/* wire nuts (group splices + caps + lead splices) */}
        {plan.wirenuts.map((nut) => {
          const p = nutPos.get(nut.id);
          if (!p) return null;
          const step = plan.connections.find(
            (c) =>
              (c.target.kind === "wirenut" && c.target.wirenutId === nut.id) ||
              (c.target.kind === "terminal" && nut.id === `${plan.deviceId}.WN-L-${c.target.terminalId}`),
          )?.step;
          return (
            <g key={nut.id} opacity={step !== undefined && dim(step) ? 0.3 : 1}>
              <WireNutShape x={p.x} y={p.y} size={nut.size} active={step !== undefined && lit(step)} />
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {rolesPresent.map((role) => {
          const wire = conductorList.find((c) => c.wire.role === role)!.wire;
          const color = WIRE_COLORS[wire.reidentifiedTo ?? wire.color];
          return (
            <span key={role} className="bp-dim flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bp-line-soft">
              <span
                className="inline-block h-1.5 w-6 rounded-full"
                style={{ backgroundColor: color.stroke, boxShadow: color.halo ? `0 0 0 1.5px ${color.halo}` : undefined }}
              />
              {ROLE_LABELS[role]}
            </span>
          );
        })}
        {conductorList.some((c) => c.wire.reidentifiedTo) && (
          <span className="bp-dim text-[10px] text-bp-line-soft">▮ = re-identification tape at both ends</span>
        )}
      </div>
    </div>
  );
}
