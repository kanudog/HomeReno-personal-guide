"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { computeFraming } from "@/lib/modules/framing";
import type { StudLayout } from "@/lib/modules/framing/types";
import { formatLength, type Sixteenths, type UnitSystem } from "@/lib/units";
import { gridIncrementFor, snapOffset, type SnapResult } from "@/lib/geometry/snap";
import { WallElevation } from "@/components/svg/WallElevation";
import { useEditor } from "@/stores/editor";

interface View {
  zoom: number;
  tx: number;
  ty: number;
}

interface DragState {
  openingId: string;
  pointerStartModelX: number;
  startOffset: number;
  snap: SnapResult | null;
}

interface ActivePointer {
  id: number;
  clientX: number;
  clientY: number;
}

export interface WallCanvasProps {
  system: UnitSystem;
}

/**
 * Interactive viewport around WallElevation. Hand-rolled Pointer Events:
 * one pointer moves an opening (with magnetic snapping) or pans; two
 * pointers pinch-zoom. Drags mutate a local draft; the store commits once
 * on release (a single undo entry).
 */
export function WallCanvas({ system }: WallCanvasProps) {
  const wall = useEditor((s) => s.wall);
  const updateOpening = useEditor((s) => s.updateOpening);
  const select = useEditor((s) => s.select);
  const selectedOpeningId = useEditor((s) => s.selectedOpeningId);
  const temporal = useEditor.temporal;
  const canUndo = useStore(temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(temporal, (s) => s.futureStates.length > 0);

  const svgHostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ zoom: 1, tx: 0, ty: 0 });

  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const pointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const movedRef = useRef(false);

  // inspect + measure
  const [info, setInfo] = useState<{ id: string; label: string; length: Sixteenths } | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([]);
  const measureModeRef = useRef(false);
  const toggleMeasure = () => {
    measureModeRef.current = !measureModeRef.current;
    setMeasureMode(measureModeRef.current);
    setMeasurePts([]);
  };

  const effectiveWall = useMemo(() => {
    if (!drag?.snap) return wall;
    return {
      ...wall,
      openings: wall.openings.map((o) =>
        o.id === drag.openingId ? { ...o, offset: drag.snap!.offset as Sixteenths } : o,
      ),
    };
  }, [wall, drag]);

  const output = useMemo(() => {
    try {
      return computeFraming(effectiveWall);
    } catch {
      return null;
    }
  }, [effectiveWall]);

  const baseOutput = useMemo(() => {
    try {
      return computeFraming(wall);
    } catch {
      return null;
    }
  }, [wall]);

  const modelPointFromClient = (clientX: number, clientY: number) => {
    const svg = svgHostRef.current?.querySelector("svg");
    if (!svg) return null;
    const ctm = (svg as SVGSVGElement).getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y, pxPerUnit: ctm.a };
  };

  const openingAtPoint = (mx: number, my: number): string | null => {
    if (!baseOutput) return null;
    const H = baseOutput.layout.input.height as number;
    const modelY = H - my;
    for (const ro of baseOutput.layout.roughOpenings) {
      const x = ro.x as number;
      const y = ro.y as number;
      const w = ro.width as number;
      const h = ro.height as number;
      const slack = 24; // fat-finger margin (1.5")
      if (mx >= x - slack && mx <= x + w + slack && modelY >= y - slack && modelY <= y + h + slack) {
        return ro.openingId;
      }
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events may lack a real pointer */
    }
    pointersRef.current.set(e.pointerId, { id: e.pointerId, clientX: e.clientX, clientY: e.clientY });
    movedRef.current = false;

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchStartRef.current = {
        dist: Math.hypot(a!.clientX - b!.clientX, a!.clientY - b!.clientY),
        zoom: view.zoom,
      };
      setDrag(null); // second finger cancels an opening drag
      return;
    }

    const pt = modelPointFromClient(e.clientX, e.clientY);
    if (!pt) return;
    const hit = openingAtPoint(pt.x, pt.y);
    if (hit) {
      const opening = wall.openings.find((o) => o.id === hit);
      if (!opening) return;
      select(hit);
      setDrag({
        openingId: hit,
        pointerStartModelX: pt.x,
        startOffset: opening.offset as number,
        snap: null,
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const tracked = pointersRef.current.get(e.pointerId);
    if (!tracked) return;
    const prev = { x: tracked.clientX, y: tracked.clientY };
    tracked.clientX = e.clientX;
    tracked.clientY = e.clientY;

    // pinch zoom
    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a!.clientX - b!.clientX, a!.clientY - b!.clientY);
      const scale = dist / pinchStartRef.current.dist;
      const zoom = Math.min(8, Math.max(0.4, pinchStartRef.current.zoom * scale));
      setView((v) => ({ ...v, zoom }));
      return;
    }

    const d = dragRef.current;
    if (d && baseOutput) {
      const pt = modelPointFromClient(e.clientX, e.clientY);
      if (!pt) return;
      const ro = baseOutput.layout.roughOpenings.find((r) => r.openingId === d.openingId);
      if (!ro) return;
      movedRef.current = true;
      const rawOffset = d.startOffset + (pt.x - d.pointerStartModelX);
      const snap = snapOffset(rawOffset, {
        wall,
        roWidth: ro.width as number,
        others: baseOutput.layout.roughOpenings.filter((r) => r.openingId !== d.openingId),
        tolerance: 14 / pt.pxPerUnit,
        gridIncrement: gridIncrementFor(pt.pxPerUnit),
      });
      setDrag({ ...d, snap });
    } else if (e.buttons > 0 || e.pointerType === "touch") {
      movedRef.current = true;
      setView((v) => ({ ...v, tx: v.tx + (e.clientX - prev.x), ty: v.ty + (e.clientY - prev.y) }));
    }
  };

  const memberAtPoint = (mx: number, myModel: number) => {
    if (!baseOutput) return null;
    const hits = baseOutput.layout.members.filter(
      (m) =>
        mx >= (m.x as number) &&
        mx <= (m.x as number) + (m.w as number) &&
        myModel >= (m.y as number) &&
        myModel <= (m.y as number) + (m.h as number),
    );
    if (hits.length === 0) return null;
    // smallest piece wins so studs beat plates when they overlap visually
    hits.sort((a, b) => (a.w as number) * (a.h as number) - (b.w as number) * (b.h as number));
    return hits[0]!;
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    const d = dragRef.current;

    // a press-and-release without movement is a tap
    if (!movedRef.current) {
      const pt = modelPointFromClient(e.clientX, e.clientY);
      if (pt && baseOutput) {
        const H = baseOutput.layout.input.height as number;
        const modelY = H - pt.y;
        if (measureModeRef.current) {
          const p = { x: Math.round(pt.x), y: Math.round(modelY) };
          setMeasurePts((pts) => (pts.length >= 2 ? [p] : [...pts, p]));
        } else {
          const m = memberAtPoint(pt.x, modelY);
          setInfo(m ? { id: m.id, label: m.label, length: m.length } : null);
        }
      }
    }

    if (d) {
      if (d.snap && movedRef.current) {
        updateOpening(d.openingId, { offset: d.snap.offset as Sixteenths });
      }
      setDrag(null);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setView((v) => ({ ...v, zoom: Math.min(8, Math.max(0.4, v.zoom * factor)) }));
  };

  if (!output) {
    return <p className="p-6 text-bp-danger">This wall can&apos;t be framed — check the dimensions.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <ToolbarButton label="Undo" disabled={!canUndo} onClick={() => temporal.getState().undo()} />
          <ToolbarButton label="Redo" disabled={!canRedo} onClick={() => temporal.getState().redo()} />
          <ToolbarButton label="Fit" onClick={() => setView({ zoom: 1, tx: 0, ty: 0 })} />
          <button
            onClick={toggleMeasure}
            className={`bp-dim rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
              measureMode
                ? "border-bp-ok bg-bp-paper-deep text-bp-ok"
                : "border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
            }`}
          >
            Measure
          </button>
        </div>
        <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
          {drag?.snap
            ? `${formatLength(drag.snap.offset as Sixteenths, { system, feetInches: true })} from wall left${drag.snap.kind !== "grid" ? ` · ${snapLabel(drag.snap.kind)}` : ""}`
            : measureMode
              ? measurePts.length === 0
                ? "tap the first point"
                : measurePts.length === 1
                  ? "tap the second point"
                  : measureLabel(measurePts, system)
              : info
                ? `${info.id} · ${info.label} · ${formatLength(info.length, { system, feetInches: true })} — tap empty space to dismiss`
                : "drag opening · tap a piece for info · pinch/wheel to zoom"}
        </span>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        className="relative select-none overflow-hidden rounded-sm border border-bp-line-faint bg-bp-paper-deep"
        style={{
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          height: "min(62vh, 640px)",
          cursor: drag ? "grabbing" : "grab",
        }}
      >
        <div
          ref={svgHostRef}
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.zoom})`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
          }}
        >
          <WallElevation
            layout={output.layout as StudLayout}
            system={system}
            showIds={false}
            className="h-full w-full"
          >
            <CanvasOverlay
              layout={output.layout as StudLayout}
              selectedOpeningId={drag?.openingId ?? selectedOpeningId}
              guideX={drag?.snap?.guideX ?? null}
              infoMemberId={info?.id ?? null}
              measurePts={measurePts}
              system={system}
            />
          </WallElevation>
        </div>
      </div>
    </div>
  );
}

function measureLabel(pts: { x: number; y: number }[], system: UnitSystem): string {
  const [a, b] = pts;
  if (!a || !b) return "";
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.round(Math.hypot(dx, dy)) as Sixteenths;
  const base = formatLength(dist, { system, feetInches: true });
  if (dx !== 0 && dy !== 0) {
    const deg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
    return `${base} @ ${deg.toFixed(1)}° from horizontal — tap again to restart`;
  }
  return `${base} (${dx === 0 ? "vertical" : "horizontal"}) — tap again to restart`;
}

function snapLabel(kind: SnapResult["kind"]): string {
  switch (kind) {
    case "oc-grid":
      return "snapped to stud grid";
    case "ro-edge":
      return "aligned with opening";
    case "midpoint":
      return "centered on wall";
    case "wall-clearance":
      return 'min 3" end clearance';
    default:
      return "";
  }
}

/** Model-space overlay: selection highlight, snap guide, inspect + measure. */
function CanvasOverlay({
  layout,
  selectedOpeningId,
  guideX,
  infoMemberId,
  measurePts,
  system,
}: {
  layout: StudLayout;
  selectedOpeningId: string | null;
  guideX: number | null;
  infoMemberId: string | null;
  measurePts: { x: number; y: number }[];
  system: UnitSystem;
}) {
  const H = layout.input.height as number;
  const fs = Math.max(28, Math.round(Math.max(layout.input.length as number, H) * 0.02));
  const infoMember = infoMemberId ? layout.members.find((m) => m.id === infoMemberId) : null;
  return (
    <>
      {layout.roughOpenings.map((ro) => {
        const selected = ro.openingId === selectedOpeningId;
        const x = ro.x as number;
        const w = ro.width as number;
        const h = ro.height as number;
        const y = H - ((ro.y as number) + h);
        return (
          <g key={ro.openingId}>
            <rect
              x={x - 24}
              y={y - 24}
              width={w + 48}
              height={h + 48}
              fill="transparent"
              style={{ cursor: "grab" }}
            />
            {selected && (
              <rect
                x={x - 12}
                y={y - 12}
                width={w + 24}
                height={h + 24}
                fill="none"
                stroke="var(--bp-accent)"
                strokeWidth={fs * 0.14}
                opacity={0.9}
              />
            )}
          </g>
        );
      })}
      {guideX !== null && (
        <line
          x1={guideX}
          y1={-fs}
          x2={guideX}
          y2={H + fs}
          stroke="var(--bp-ok)"
          strokeWidth={fs * 0.1}
          strokeDasharray={`${fs * 0.4} ${fs * 0.3}`}
        />
      )}

      {/* inspected member highlight */}
      {infoMember && (
        <rect
          x={infoMember.x as number}
          y={H - ((infoMember.y as number) + (infoMember.h as number))}
          width={infoMember.w as number}
          height={infoMember.h as number}
          fill="none"
          stroke="var(--bp-ok)"
          strokeWidth={fs * 0.16}
        />
      )}

      {/* measure points + line + label */}
      {measurePts.map((p, i) => (
        <circle key={i} cx={p.x} cy={H - p.y} r={fs * 0.28} fill="var(--bp-ok)" />
      ))}
      {measurePts.length === 2 && (
        <g>
          <line
            x1={measurePts[0]!.x}
            y1={H - measurePts[0]!.y}
            x2={measurePts[1]!.x}
            y2={H - measurePts[1]!.y}
            stroke="var(--bp-ok)"
            strokeWidth={fs * 0.1}
          />
          <text
            x={(measurePts[0]!.x + measurePts[1]!.x) / 2}
            y={(H - measurePts[0]!.y + (H - measurePts[1]!.y)) / 2 - fs * 0.5}
            fontSize={fs * 0.8}
            fill="var(--bp-ok)"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {formatLength(
              Math.round(
                Math.hypot(
                  measurePts[1]!.x - measurePts[0]!.x,
                  measurePts[1]!.y - measurePts[0]!.y,
                ),
              ) as Sixteenths,
              { system, feetInches: true },
            )}
          </text>
        </g>
      )}
    </>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors enabled:hover:border-bp-accent enabled:hover:text-bp-accent disabled:opacity-40"
    >
      {label}
    </button>
  );
}
