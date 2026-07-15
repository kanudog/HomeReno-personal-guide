"use client";

import { useState } from "react";
import { formatLength, inches, type Sixteenths, type UnitSystem } from "@/lib/units";
import type { LumberSize, OpeningInput, StudLayout, WallInput } from "@/lib/modules/framing/types";
import { TapeMeasureInput } from "@/components/measure/TapeMeasureInput";

const selectCls =
  "bp-dim h-11 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-bp-line outline-none focus:border-bp-accent";

export interface WallFormProps {
  wall: WallInput;
  layout: StudLayout;
  system: UnitSystem;
  onWall: (patch: Partial<WallInput>) => void;
  onOpening: (id: string, patch: Partial<OpeningInput>) => void;
  onAddOpening: (kind: OpeningInput["kind"]) => void;
  onRemoveOpening: (id: string) => void;
  selectedOpeningId?: string | null;
  onSelect?: (id: string | null) => void;
}

export function WallForm({
  wall,
  layout,
  system,
  onWall,
  onOpening,
  onAddOpening,
  onRemoveOpening,
  selectedOpeningId,
  onSelect,
}: WallFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="bp-panel p-4">
        <h3 className="bp-panel-title mb-3 text-sm">Wall</h3>
        <div className="flex flex-wrap items-end gap-3">
          <TapeMeasureInput
            label="Length"
            value={wall.length}
            onChange={(v) => onWall({ length: v })}
            system={system}
          />
          <TapeMeasureInput
            label="Height"
            value={wall.height}
            onChange={(v) => onWall({ height: v })}
            system={system}
          />
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Stud
            </span>
            <select
              className={selectCls}
              value={wall.studSize}
              onChange={(e) => onWall({ studSize: e.target.value as LumberSize })}
            >
              <option value="2x4">2×4</option>
              <option value="2x6">2×6</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Spacing
            </span>
            <select
              className={selectCls}
              value={wall.spacingOC as number}
              onChange={(e) => onWall({ spacingOC: Number(e.target.value) as Sixteenths })}
            >
              <option value={inches(16) as number}>16&Prime; OC</option>
              <option value={inches(24) as number}>24&Prime; OC</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Top plate
            </span>
            <select
              className={selectCls}
              value={wall.topPlate}
              onChange={(e) => onWall({ topPlate: e.target.value as "single" | "double" })}
            >
              <option value="double">Double</option>
              <option value="single">Single</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 self-end">
            <input
              type="checkbox"
              checked={wall.loadBearing}
              onChange={(e) => onWall({ loadBearing: e.target.checked })}
              className="h-5 w-5 accent-[var(--bp-accent)]"
            />
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Load-bearing
            </span>
          </label>
          <label className="flex h-11 items-center gap-2 self-end">
            <input
              type="checkbox"
              checked={wall.bottomPlatePT}
              onChange={(e) => onWall({ bottomPlatePT: e.target.checked })}
              className="h-5 w-5 accent-[var(--bp-accent)]"
            />
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              PT bottom plate
            </span>
          </label>
          <label className="flex h-11 items-center gap-2 self-end">
            <input
              type="checkbox"
              checked={wall.fireBlocking?.enabled ?? false}
              onChange={(e) => onWall({ fireBlocking: { enabled: e.target.checked } })}
              className="h-5 w-5 accent-[var(--bp-accent)]"
            />
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Fire blocking
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Left corner
            </span>
            <select
              className={selectCls}
              value={wall.corners?.start ?? "none"}
              onChange={(e) =>
                onWall({
                  corners: {
                    start: e.target.value as NonNullable<WallInput["corners"]>["start"],
                    end: wall.corners?.end ?? "none",
                  },
                })
              }
            >
              <option value="none">None</option>
              <option value="california">California</option>
              <option value="double">Double stud</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Right corner
            </span>
            <select
              className={selectCls}
              value={wall.corners?.end ?? "none"}
              onChange={(e) =>
                onWall({
                  corners: {
                    start: wall.corners?.start ?? "none",
                    end: e.target.value as NonNullable<WallInput["corners"]>["end"],
                  },
                })
              }
            >
              <option value="none">None</option>
              <option value="california">California</option>
              <option value="double">Double stud</option>
            </select>
          </label>
        </div>
      </section>

      <section className="bp-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="bp-panel-title text-sm">Openings</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onAddOpening("door")}
              className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors hover:bg-bp-accent hover:text-bp-paper-deep"
            >
              + Door
            </button>
            <button
              onClick={() => onAddOpening("window")}
              className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors hover:bg-bp-accent hover:text-bp-paper-deep"
            >
              + Window
            </button>
          </div>
        </div>

        {wall.openings.length === 0 && (
          <p className="text-sm text-bp-line-soft">
            No openings — a solid stud wall. Add a door or window above.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {wall.openings.map((o) => {
            const ro = layout.roughOpenings.find((r) => r.openingId === o.id);
            const selected = selectedOpeningId === o.id;
            return (
              <div
                key={o.id}
                onClick={() => onSelect?.(o.id)}
                className={`rounded-sm border p-3 transition-colors ${
                  selected ? "border-bp-accent" : "border-bp-line-faint"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="bp-dim text-[11px] uppercase tracking-widest text-bp-line">
                    {o.kind === "door" ? "Door" : "Window"}{" "}
                    <span className="text-bp-line-soft">{o.id}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOpening(o.id);
                    }}
                    className="bp-dim text-[11px] uppercase tracking-widest text-bp-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <AnchoredOffset
                    opening={o}
                    roWidth={(ro?.width as number) ?? (o.unitWidth as number)}
                    wallLength={wall.length as number}
                    system={system}
                    onOffset={(v) => onOpening(o.id, { offset: v })}
                  />
                  <TapeMeasureInput
                    compact
                    label={o.kind === "door" ? "Slab width" : "Unit width"}
                    value={o.unitWidth}
                    onChange={(v) => onOpening(o.id, { unitWidth: v })}
                    system={system}
                  />
                  <TapeMeasureInput
                    compact
                    label={o.kind === "door" ? "Slab height" : "Unit height"}
                    value={o.unitHeight}
                    onChange={(v) => onOpening(o.id, { unitHeight: v })}
                    system={system}
                  />
                  {o.kind === "window" && (
                    <AnchoredSill
                      sill={(o.sillHeight ?? inches(36)) as number}
                      roHeight={(ro?.height as number) ?? (o.unitHeight as number)}
                      wallHeight={wall.height as number}
                      system={system}
                      onSill={(v) => onOpening(o.id, { sillHeight: v })}
                    />
                  )}
                  <label className="flex h-9 items-center gap-2 self-end">
                    <input
                      type="checkbox"
                      checked={!!o.roOverride}
                      onChange={(e) =>
                        onOpening(o.id, {
                          roOverride: e.target.checked
                            ? { width: ro?.width ?? o.unitWidth, height: ro?.height ?? o.unitHeight }
                            : undefined,
                        })
                      }
                      className="h-4 w-4 accent-[var(--bp-accent)]"
                    />
                    <span className="bp-dim text-[9px] uppercase tracking-widest text-bp-line-soft">
                      RO override
                    </span>
                  </label>
                  {o.roOverride && (
                    <>
                      <TapeMeasureInput
                        compact
                        label="RO width"
                        value={o.roOverride.width}
                        onChange={(v) =>
                          onOpening(o.id, { roOverride: { ...o.roOverride!, width: v } })
                        }
                        system={system}
                      />
                      <TapeMeasureInput
                        compact
                        label="RO height"
                        value={o.roOverride.height}
                        onChange={(v) =>
                          onOpening(o.id, { roOverride: { ...o.roOverride!, height: v } })
                        }
                        system={system}
                      />
                    </>
                  )}
                </div>
                {ro && (
                  <p className="bp-dim mt-2 text-[11px] text-bp-line-soft">
                    Rough opening:{" "}
                    <span className="text-bp-accent">
                      {fmtRO(ro.width, system)} × {fmtRO(ro.height, system)}
                    </span>
                    {" · "}Header: {ro.headerSpec.plies}× {ro.headerSpec.size}
                    {ro.headerSpec.orientation === "flat" ? " flat" : ""}
                    {ro.headerSpec.engineered ? " — ENGINEERED REQUIRED" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {layout.warnings.length > 0 && (
        <section className="rounded-sm border border-bp-warn/60 bg-bp-paper-deep p-4">
          <h3 className="bp-panel-title mb-2 text-sm" style={{ color: "var(--bp-warn)" }}>
            Warnings
          </h3>
          <ul className="flex flex-col gap-1">
            {layout.warnings.map((w, i) => (
              <li key={i} className="text-sm text-bp-line-soft">
                <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-warn">
                  [{w.code}]
                </span>{" "}
                {w.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function fmtRO(v: Sixteenths, system: UnitSystem) {
  return formatLength(v, { system });
}

const anchorBtn = (active: boolean) =>
  `bp-dim px-1.5 py-0.5 text-[9px] uppercase tracking-widest transition-colors ${
    active ? "bg-bp-accent text-bp-paper-deep" : "text-bp-line-soft hover:text-bp-line"
  }`;

/**
 * Horizontal placement with a switchable anchor: distance from the wall's
 * LEFT end to the RO edge, or from the RIGHT end — the canonical offset is
 * computed from whichever the user prefers to measure.
 */
function AnchoredOffset({
  opening,
  roWidth,
  wallLength,
  system,
  onOffset,
}: {
  opening: OpeningInput;
  roWidth: number;
  wallLength: number;
  system: UnitSystem;
  onOffset: (v: Sixteenths) => void;
}) {
  const [anchor, setAnchor] = useState<"left" | "right">("left");
  const offset = opening.offset as number;
  const shown = anchor === "left" ? offset : Math.max(0, wallLength - offset - roWidth);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className="bp-dim text-[9px] uppercase tracking-widest text-bp-line-soft">RO from</span>
        <div className="flex overflow-hidden rounded-sm border border-bp-line-faint">
          <button type="button" className={anchorBtn(anchor === "left")} onClick={() => setAnchor("left")}>
            left
          </button>
          <button type="button" className={anchorBtn(anchor === "right")} onClick={() => setAnchor("right")}>
            right
          </button>
        </div>
      </div>
      <TapeMeasureInput
        compact
        label=""
        value={shown as Sixteenths}
        onChange={(v) =>
          onOffset(
            (anchor === "left"
              ? (v as number)
              : Math.max(0, wallLength - (v as number) - roWidth)) as Sixteenths,
          )
        }
        system={system}
      />
    </div>
  );
}

/**
 * Vertical placement for windows: measure the sill height, the head
 * (RO top) from the floor, or the head down from the ceiling.
 */
function AnchoredSill({
  sill,
  roHeight,
  wallHeight,
  system,
  onSill,
}: {
  sill: number;
  roHeight: number;
  wallHeight: number;
  system: UnitSystem;
  onSill: (v: Sixteenths) => void;
}) {
  const [anchor, setAnchor] = useState<"sill" | "head" | "ceiling">("sill");
  const head = sill + roHeight;
  const shown = anchor === "sill" ? sill : anchor === "head" ? head : Math.max(0, wallHeight - head);
  const toSill = (v: number) =>
    anchor === "sill" ? v : anchor === "head" ? v - roHeight : wallHeight - v - roHeight;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <div className="flex overflow-hidden rounded-sm border border-bp-line-faint">
          <button type="button" className={anchorBtn(anchor === "sill")} onClick={() => setAnchor("sill")}>
            sill ↑
          </button>
          <button type="button" className={anchorBtn(anchor === "head")} onClick={() => setAnchor("head")}>
            head ↑
          </button>
          <button type="button" className={anchorBtn(anchor === "ceiling")} onClick={() => setAnchor("ceiling")}>
            head ↓clg
          </button>
        </div>
      </div>
      <TapeMeasureInput
        compact
        label=""
        value={shown as Sixteenths}
        onChange={(v) => onSill(Math.max(0, toSill(v as number)) as Sixteenths)}
        system={system}
      />
    </div>
  );
}
