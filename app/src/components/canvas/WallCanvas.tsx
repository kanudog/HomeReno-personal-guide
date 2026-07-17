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

/** Measure point in model coords (y up from the subfloor). */
interface MeasurePoint {
  x: number;
  y: number;
  /** Landed on a framing corner (drawn as a captured square). */
  snapped: boolean;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ zoom: 1, tx: 0, ty: 0 });

  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const pointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const movedRef = useRef(false);

  // inspect + measure
  const [info, setInfo] = useState<{ id: string; label: string; length: Sixteenths } | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<MeasurePoint[]>([]);
  const measureModeRef = useRef(false);
  const measureDragRef = useRef<{
    index: number;
    startPt: MeasurePoint;
    startPointer: { x: number; y: number };
  } | null>(null);
  const toggleMeasure = () => {
    measureModeRef.current = !measureModeRef.current;
    setMeasureMode(measureModeRef.current);
    setMeasurePts([]);
  };

  /** Zoom about a container-relative anchor: the point under it stays put. */
  const zoomAt = (anchorX: number, anchorY: number, factor: number) => {
    setView((v) => {
      const zoom = Math.min(8, Math.max(0.4, v.zoom * factor));
      const k = zoom / v.zoom;
      return {
        zoom,
        tx: anchorX - k * (anchorX - v.tx),
        ty: anchorY - k * (anchorY - v.ty),
      };
    });
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

  const wallH = baseOutput ? (baseOutput.layout.input.height as number) : 0;
  const fsModel = baseOutput
    ? Math.max(28, Math.round(Math.max(baseOutput.layout.input.length as number, wallH) * 0.02))
    : 28;
  /** Ring-handle radius in model units — roughly constant on screen. */
  const ringR = (fsModel * 2.1) / view.zoom;

  // corner targets for measure snapping: every member + RO corner
  const cornerTargets = useMemo(() => {
    if (!baseOutput) return [] as { x: number; y: number }[];
    const pts: { x: number; y: number }[] = [];
    const push = (x: number, y: number, w: number, h: number) => {
      pts.push({ x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h });
    };
    for (const m of baseOutput.layout.members) {
      push(m.x as number, m.y as number, m.w as number, m.h as number);
    }
    for (const ro of baseOutput.layout.roughOpenings) {
      push(ro.x as number, ro.y as number, ro.width as number, ro.height as number);
    }
    return pts;
  }, [baseOutput]);

  const snapCorner = (mx: number, my: number, tol: number) => {
    let best: { x: number; y: number; d: number } | null = null;
    for (const p of cornerTargets) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d <= tol && (best === null || d < best.d)) best = { ...p, d };
    }
    return best;
  };

  const toMeasurePoint = (mx: number, my: number, tol: number): MeasurePoint => {
    const snap = snapCorner(mx, my, tol);
    return snap
      ? { x: snap.x, y: snap.y, snapped: true }
      : { x: Math.round(mx), y: Math.round(my), snapped: false };
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
      setDrag(null); // second finger cancels an opening drag
      measureDragRef.current = null;
      return;
    }

    const pt = modelPointFromClient(e.clientX, e.clientY);
    if (!pt) return;

    if (measureModeRef.current) {
      // grab a measure point by its ring handle — finger stays off-center
      const my = wallH - pt.y;
      const idx = measurePts.findIndex((p) => Math.hypot(p.x - pt.x, p.y - my) <= ringR * 1.3);
      if (idx >= 0) {
        measureDragRef.current = {
          index: idx,
          startPt: measurePts[idx]!,
          startPointer: { x: pt.x, y: my },
        };
      }
      return; // measure mode never drags openings
    }

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

    // pinch: zoom about the finger midpoint + pan with it (incremental)
    if (pointersRef.current.size === 2) {
      const other = [...pointersRef.current.values()].find((p) => p.id !== e.pointerId);
      if (!other) return;
      movedRef.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const prevMid = { x: (prev.x + other.clientX) / 2, y: (prev.y + other.clientY) / 2 };
      const newMid = { x: (e.clientX + other.clientX) / 2, y: (e.clientY + other.clientY) / 2 };
      const prevDist = Math.hypot(prev.x - other.clientX, prev.y - other.clientY);
      const newDist = Math.hypot(e.clientX - other.clientX, e.clientY - other.clientY);
      if (prevDist < 1) return;
      setView((v) => {
        const zoom = Math.min(8, Math.max(0.4, v.zoom * (newDist / prevDist)));
        const k = zoom / v.zoom;
        const ax = prevMid.x - rect.left;
        const ay = prevMid.y - rect.top;
        return {
          zoom,
          tx: ax - k * (ax - v.tx) + (newMid.x - prevMid.x),
          ty: ay - k * (ay - v.ty) + (newMid.y - prevMid.y),
        };
      });
      return;
    }

    // fine-adjust a measure point via its ring handle
    const md = measureDragRef.current;
    if (md) {
      const pt = modelPointFromClient(e.clientX, e.clientY);
      if (!pt) return;
      movedRef.current = true;
      const my = wallH - pt.y;
      const raw = {
        x: md.startPt.x + (pt.x - md.startPointer.x),
        y: md.startPt.y + (my - md.startPointer.y),
      };
      const next = toMeasurePoint(raw.x, raw.y, 10 / pt.pxPerUnit);
      setMeasurePts((pts) => pts.map((p, i) => (i === md.index ? next : p)));
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
    const d = dragRef.current;

    // a press-and-release without movement is a tap
    if (!movedRef.current) {
      const pt = modelPointFromClient(e.clientX, e.clientY);
      if (pt && baseOutput) {
        const H = baseOutput.layout.input.height as number;
        const modelY = H - pt.y;
        if (measureModeRef.current) {
          const p = toMeasurePoint(pt.x, modelY, 14 / pt.pxPerUnit);
          setMeasurePts((pts) => (pts.length >= 2 ? [p] : [...pts, p]));
        } else {
          const m = memberAtPoint(pt.x, modelY);
          setInfo(m ? { id: m.id, label: m.label, length: m.length } : null);
        }
      }
    }

    measureDragRef.current = null;
    if (d) {
      if (d.snap && movedRef.current) {
        updateOpening(d.openingId, { offset: d.snap.offset as Sixteenths });
      }
      setDrag(null);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    if (rect) zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    else setView((v) => ({ ...v, zoom: Math.min(8, Math.max(0.4, v.zoom * factor)) }));
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
                ? "tap the first point — it snaps to framing corners"
                : measurePts.length === 1
                  ? "tap the second point · drag a ring's edge to fine-tune"
                  : measureLabel(measurePts, system)
              : info
                ? `${info.id} · ${info.label} · ${formatLength(info.length, { system, feetInches: true })} — tap empty space to dismiss`
                : "drag opening · tap a piece for info · pinch/wheel to zoom"}
        </span>
      </div>

      <div
        ref={containerRef}
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
              ringR={ringR}
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
  ringR,
  system,
}: {
  layout: StudLayout;
  selectedOpeningId: string | null;
  guideX: number | null;
  infoMemberId: string | null;
  measurePts: MeasurePoint[];
  ringR: number;
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

      {/* measure points: crosshair + dashed ring drag handle */}
      {measurePts.map((p, i) => (
        <MeasureMarker key={i} x={p.x} y={H - p.y} r={ringR} snapped={p.snapped} />
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

/**
 * Crosshair inside a dashed ring: the ring is the drag handle, so a finger
 * on it never covers the exact point. A small square marks a captured
 * framing corner.
 */
function MeasureMarker({ x, y, r, snapped }: { x: number; y: number; r: number; snapped: boolean }) {
  const gap = r * 0.14; // hairline gap so the exact point stays visible
  const hair = r * 0.82;
  const sw = r * 0.045;
  return (
    <g style={{ cursor: "grab" }}>
      <circle cx={x} cy={y} r={r} fill="var(--bp-ok)" fillOpacity={0.05} stroke="var(--bp-ok)" strokeWidth={sw * 1.4} strokeDasharray={`${r * 0.16} ${r * 0.12}`} />
      <line x1={x - hair} y1={y} x2={x - gap} y2={y} stroke="var(--bp-ok)" strokeWidth={sw} />
      <line x1={x + gap} y1={y} x2={x + hair} y2={y} stroke="var(--bp-ok)" strokeWidth={sw} />
      <line x1={x} y1={y - hair} x2={x} y2={y - gap} stroke="var(--bp-ok)" strokeWidth={sw} />
      <line x1={x} y1={y + gap} x2={x} y2={y + hair} stroke="var(--bp-ok)" strokeWidth={sw} />
      <circle cx={x} cy={y} r={sw * 1.5} fill="var(--bp-ok)" />
      {snapped && (
        <rect
          x={x - r * 0.24}
          y={y - r * 0.24}
          width={r * 0.48}
          height={r * 0.48}
          fill="none"
          stroke="var(--bp-ok)"
          strokeWidth={sw}
        />
      )}
    </g>
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
