"use client";

import { useMemo } from "react";
import { computeFraming } from "@/lib/modules/framing";
import { computeRoom } from "@/lib/modules/framing/room";
import type { StudLayout } from "@/lib/modules/framing/types";
import type { DeviceInput, ElectricalOutput } from "@/lib/modules/electrical/types";
import {
  BORE_DIAMETER_IN,
  BOX_FACE_H,
  BOX_FACE_W,
  routeOnWall,
  type WallRoutingResult,
} from "@/lib/modules/electrical/engine/wallRouting";
import { WallElevation } from "@/components/svg/WallElevation";
import { TapeMeasureInput } from "@/components/measure/TapeMeasureInput";
import { formatLength, inches, type Sixteenths, type UnitSystem } from "@/lib/units";
import { useElectrical } from "@/stores/electrical";
import { useEditor } from "@/stores/editor";
import { useRoom } from "@/stores/room";

/**
 * Optional framing integration: for every device marked onto a framed wall
 * (the scratch designer wall or a room-planner wall), snap its box beside
 * a stud, plan the bore holes, and draw both on the wall's elevation.
 */
export function WallRoutingPanel({
  output,
  system,
}: {
  output: ElectricalOutput;
  system: UnitSystem;
}) {
  const input = useElectrical((s) => s.input);
  const wallRouting = useElectrical((s) => s.wallRouting);
  const setWallRouting = useElectrical((s) => s.setWallRouting);
  const scratchWall = useEditor((s) => s.wall);
  const plan = useRoom((s) => s.plan);

  const marked = input.circuits.flatMap((c) =>
    c.devices.filter((d) => d.wallDesignId !== undefined),
  );

  const roomResult = useMemo(() => {
    if (!marked.some((d) => d.wallDesignId?.startsWith("room:"))) return null;
    try {
      return computeRoom(plan);
    } catch {
      return null;
    }
  }, [plan, marked]);

  const walls = useMemo(() => {
    const byWall = new Map<string, DeviceInput[]>();
    for (const d of marked) {
      const key = d.wallDesignId!;
      byWall.set(key, [...(byWall.get(key) ?? []), d]);
    }
    const resolved: { key: string; title: string; layout: StudLayout; devices: DeviceInput[] }[] = [];
    for (const [key, devices] of byWall) {
      if (key === "scratch-wall") {
        try {
          resolved.push({
            key,
            title: "Framing designer wall",
            layout: computeFraming(scratchWall).layout,
            devices,
          });
        } catch {
          // unframable wall — skip silently; the framing designer shows why
        }
      } else if (key.startsWith("room:")) {
        const wallId = key.slice(5);
        const placed = roomResult?.walls.find((w) => w.plan.id === wallId);
        if (placed) {
          resolved.push({ key, title: `Room planner — ${placed.plan.name}`, layout: placed.output.layout, devices });
        }
      }
    }
    return resolved;
  }, [marked, scratchWall, roomResult]);

  if (walls.length === 0) return null;

  return (
    <>
      {walls.map(({ key, title, layout, devices }) => {
        const routing: WallRoutingResult = routeOnWall(
          layout,
          devices.map((d) => ({
            deviceId: d.id,
            displayName:
              output.devicePlans.find((p) => p.deviceId === d.id)?.displayName ?? d.kind,
            x: (d.xOnWall ?? inches(24)) as Sixteenths,
            heightAFF: (d.heightAFF ?? inches(12)) as Sixteenths,
          })),
          wallRouting,
        );
        const H = layout.input.height as number;
        const L = layout.input.length as number;
        const yLine = H - (routing.drillHeight as number);
        const farBay =
          routing.entry === "left"
            ? Math.max(...routing.routes.map((r) => r.snappedX as number), 0)
            : Math.min(...routing.routes.map((r) => (r.snappedX as number) + (BOX_FACE_W as number)), L);

        return (
          <section key={key} className="bp-panel p-3">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <p className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
                Wall routing — {title}
              </p>
              <div className="flex items-end gap-2">
                <label className="flex flex-col gap-0.5">
                  <span className="bp-dim text-[9px] uppercase tracking-widest text-bp-line-soft">
                    Cable enters from
                  </span>
                  <select
                    className="bp-dim h-9 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent"
                    value={wallRouting.entry}
                    onChange={(e) => setWallRouting({ entry: e.target.value as "left" | "right" })}
                  >
                    <option value="left">Left end</option>
                    <option value="right">Right end</option>
                  </select>
                </label>
                <TapeMeasureInput
                  compact
                  label="Drill height"
                  value={wallRouting.drillHeight}
                  onChange={(v) => setWallRouting({ drillHeight: v })}
                  system={system}
                />
              </div>
            </div>

            <WallElevation
              layout={layout}
              system={system}
              markers={routing.routes.map((r) => ({
                x: r.snappedX,
                y: r.heightAFF,
                w: BOX_FACE_W,
                h: BOX_FACE_H,
                label: r.displayName,
              }))}
            >
              {routing.routes.length > 0 && (
                <g>
                  <line
                    x1={routing.entry === "left" ? 0 : L}
                    y1={yLine}
                    x2={farBay}
                    y2={yLine}
                    stroke="var(--wire-bare)"
                    strokeWidth={6}
                    strokeDasharray="28 18"
                    opacity={0.85}
                  />
                  {routing.combinedBoreHoles.map((h) => (
                    <g key={h.memberId}>
                      <circle
                        cx={h.x as number}
                        cy={yLine}
                        r={14}
                        fill="var(--bp-paper-deep)"
                        stroke="var(--bp-accent)"
                        strokeWidth={5}
                      />
                      <circle cx={h.x as number} cy={yLine} r={4} fill="var(--bp-accent)" />
                    </g>
                  ))}
                </g>
              )}
            </WallElevation>

            {routing.warnings.map((w, i) => (
              <p key={i} className="bp-dim mt-1 text-[11px] text-bp-warn">
                ⚠ {w}
              </p>
            ))}

            <div className="mt-2 flex flex-col gap-1">
              {routing.routes.map((r) => (
                <p key={r.deviceId} className="bp-dim text-[11px] text-bp-line-soft">
                  <span className="text-bp-line">{r.displayName}</span>: box tight against the{" "}
                  <span className="text-bp-accent">{r.side} face of {r.studId}</span>, left edge at{" "}
                  {formatLength(r.snappedX, { system, feetInches: true })}
                  {r.requestedX !== r.snappedX
                    ? ` (snapped from ${formatLength(r.requestedX, { system, feetInches: true })})`
                    : ""}
                  , bottom {formatLength(r.heightAFF, { system })} AFF ·{" "}
                  {r.boreHoles.length === 0
                    ? "no studs to bore"
                    : `bore ${r.boreHoles.map((h) => `${h.memberId} @ ${formatLength(h.x, { system, feetInches: true })}`).join(", ")}`}
                </p>
              ))}
              {routing.combinedBoreHoles.length > 0 && (
                <p className="bp-dim text-[11px] text-bp-line">
                  Drill list: {routing.combinedBoreHoles.length} × {BORE_DIAMETER_IN}&quot; holes at{" "}
                  {formatLength(routing.drillHeight, { system })} —{" "}
                  {routing.combinedBoreHoles
                    .map((h) => formatLength(h.x, { system, feetInches: true }))
                    .join(", ")}
                </p>
              )}
              {routing.notes.map((n, i) => (
                <p key={i} className="bp-dim text-[10px] text-bp-line-soft">
                  • {n}
                </p>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
