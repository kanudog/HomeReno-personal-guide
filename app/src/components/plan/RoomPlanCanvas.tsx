"use client";

import { formatLength, type Sixteenths, type UnitSystem } from "@/lib/units";
import { DIR_VECTOR, type RoomResult } from "@/lib/modules/framing/room";
import { LUMBER_DIMS } from "@/lib/modules/framing/data/lumber";

/**
 * Top-down plan view: walls as double lines with thickness, openings
 * marked (door swing arc / window lines), per-wall dimensions, corner
 * dots. Tap a wall to select it for elevation editing.
 */
export function RoomPlanCanvas({
  room,
  selectedWallId,
  onSelect,
  system,
}: {
  room: RoomResult;
  selectedWallId: string | null;
  onSelect: (id: string) => void;
  system: UnitSystem;
}) {
  // plan bounds from drawn geometry
  let minX = 0,
    minY = 0,
    maxX = 0,
    maxY = 0;
  for (const w of room.walls) {
    const [sx, sy] = w.drawnStart;
    const [dx, dy] = DIR_VECTOR[w.dir];
    const ex = sx + dx * (w.plan.length as number);
    const ey = sy + dy * (w.plan.length as number);
    minX = Math.min(minX, sx, ex);
    maxX = Math.max(maxX, sx, ex);
    minY = Math.min(minY, sy, ey);
    maxY = Math.max(maxY, sy, ey);
  }
  const pad = 320;
  const W = maxX - minX + pad * 2 || 1000;
  const H = maxY - minY + pad * 2 || 1000;
  const fs = Math.max(28, Math.round(Math.max(W, H) * 0.018));

  const fmt = (v: number) =>
    formatLength(v as Sixteenths, { system, feetInches: system === "imperial", bare: true });

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${W} ${H}`}
      className="h-auto w-full"
      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
    >
      {room.walls.map((w) => {
        const depth = LUMBER_DIMS[w.plan.template.studSize].width as number;
        const len = w.plan.length as number;
        const [dx, dy] = DIR_VECTOR[w.dir];
        const [sx, sy] = w.drawnStart;
        const horizontal = dy === 0;
        const selected = w.plan.id === selectedWallId;

        // wall rectangle: centerline along the drawn segment
        const rx = horizontal ? Math.min(sx, sx + dx * len) : sx - depth / 2;
        const ry = horizontal ? sy - depth / 2 : Math.min(sy, sy + dy * len);
        const rw = horizontal ? len : depth;
        const rh = horizontal ? depth : len;

        // dimension line offset to the outside
        const dimOff = depth / 2 + fs * 1.6;

        return (
          <g key={w.plan.id} onClick={() => onSelect(w.plan.id)} style={{ cursor: "pointer" }}>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={selected ? "var(--bp-accent)" : "var(--member-plate)"}
              fillOpacity={selected ? 0.28 : 0.14}
              stroke={selected ? "var(--bp-accent)" : "var(--bp-line-soft)"}
              strokeWidth={fs * 0.08}
            />

            {/* openings along the wall */}
            {w.output.layout.roughOpenings.map((ro) => {
              const along = (ro.x as number) + (w.origin[0] !== sx || w.origin[1] !== sy ? LUMBER_DIMS[w.plan.template.studSize].width as number : 0);
              const ox = sx + dx * along;
              const oy = sy + dy * along;
              const olen = ro.width as number;
              const orx = horizontal ? Math.min(ox, ox + dx * olen) : ox - depth / 2;
              const ory = horizontal ? oy - depth / 2 : Math.min(oy, oy + dy * olen);
              return (
                <g key={ro.openingId}>
                  <rect
                    x={orx}
                    y={ory}
                    width={horizontal ? olen : depth}
                    height={horizontal ? depth : olen}
                    fill="var(--bp-paper)"
                    stroke="var(--bp-accent)"
                    strokeWidth={fs * 0.06}
                    strokeDasharray={ro.kind === "window" ? `${fs * 0.4} ${fs * 0.3}` : undefined}
                  />
                  {ro.kind === "door" && (
                    <path
                      d={
                        horizontal
                          ? `M ${orx} ${ory + depth} A ${olen} ${olen} 0 0 1 ${orx + olen} ${ory + depth + olen}`
                          : `M ${orx + depth} ${ory} A ${olen} ${olen} 0 0 1 ${orx + depth + olen} ${ory + olen}`
                      }
                      fill="none"
                      stroke="var(--bp-accent)"
                      strokeWidth={fs * 0.05}
                      opacity={0.6}
                    />
                  )}
                </g>
              );
            })}

            {/* name + dimension */}
            <text
              x={sx + (dx * len) / 2 + (horizontal ? 0 : dimOff + fs)}
              y={sy + (dy * len) / 2 + (horizontal ? -dimOff : 0)}
              fontSize={fs}
              fill={selected ? "var(--bp-accent)" : "var(--bp-line)"}
              textAnchor="middle"
              transform={
                horizontal
                  ? undefined
                  : `rotate(90 ${sx + dimOff + fs} ${sy + (dy * len) / 2})`
              }
            >
              {w.plan.name} · {fmt(len)}
            </text>
          </g>
        );
      })}

      {/* corner markers */}
      {room.walls.map((w, i) => {
        const next = room.walls[i + 1];
        if (!next) return null;
        const [dx, dy] = DIR_VECTOR[w.dir];
        const jx = w.drawnStart[0] + dx * (w.plan.length as number);
        const jy = w.drawnStart[1] + dy * (w.plan.length as number);
        return (
          <g key={`corner-${i}`}>
            <circle cx={jx} cy={jy} r={fs * 0.5} fill="var(--member-corner)" opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}
