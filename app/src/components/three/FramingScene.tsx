"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Edges, Line, OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import type { MemberRole, StudLayout } from "@/lib/modules/framing/types";
import { ASSEMBLY_STEPS } from "@/lib/modules/framing/engine/tasks";
import { formatLength, type Sixteenths } from "@/lib/units";
import { layoutToSolids, type Solid } from "@/lib/three/solids";
import { generateFasteners } from "@/lib/three/fasteners";
import { exportGLB, exportOBJ, exportText } from "@/lib/three/exporters";
import { generateOpenSCAD } from "@/lib/three/openscad";

/** Role colors mirroring the blueprint theme (three needs literal colors). */
export const ROLE_COLOR_3D: Record<MemberRole, string> = {
  "plate-bottom": "#8ecae6",
  "plate-top": "#8ecae6",
  "plate-cap": "#5fa8d3",
  "stud-common": "#e8f2fc",
  "stud-corner": "#4dd0c4",
  "stud-king": "#f4a261",
  "stud-jack": "#e9c46a",
  "header-ply": "#e76f51",
  "cripple-above": "#a3d977",
  "cripple-below": "#a3d977",
  sill: "#c9a3ff",
  blocking: "#90a8c0",
};
const ROLE_COLOR = ROLE_COLOR_3D;

/** Exploded-view direction per role (unit inches, scaled by the slider). */
const EXPLODE_DIR: Record<MemberRole, [number, number, number]> = {
  "plate-bottom": [0, -14, 0],
  "plate-top": [0, 10, 0],
  "plate-cap": [0, 22, 0],
  "stud-common": [0, 0, 14],
  "stud-corner": [0, 0, -18],
  "stud-king": [0, 0, -14],
  "stud-jack": [0, 0, 18],
  "header-ply": [0, 6, -22],
  "cripple-above": [0, 4, 12],
  "cripple-below": [0, -4, 12],
  sill: [0, -8, 18],
  blocking: [0, 0, 24],
};

interface Selected {
  id: string;
  label: string;
  lengthIn: number;
}

function SolidMesh({
  solid,
  explode,
  selected,
  onPick,
}: {
  solid: Solid;
  explode: number;
  selected: boolean;
  onPick: (e: ThreeEvent<MouseEvent>, s: Solid) => void;
}) {
  const dir = EXPLODE_DIR[solid.role];
  const pos: [number, number, number] = [
    solid.position[0] + dir[0] * explode,
    solid.position[1] + dir[1] * explode,
    solid.position[2] + dir[2] * explode,
  ];
  return (
    <mesh position={pos} onClick={(e) => onPick(e, solid)}>
      <boxGeometry args={solid.size} />
      <meshStandardMaterial
        color={ROLE_COLOR[solid.role]}
        roughness={0.85}
        metalness={0}
        emissive={selected ? "#f4a261" : "#000000"}
        emissiveIntensity={selected ? 0.5 : 0}
      />
      <Edges color="#0a2138" lineWidth={1} />
    </mesh>
  );
}

export function FramingScene({ layout }: { layout: StudLayout }) {
  const solids = useMemo(() => layoutToSolids(layout), [layout]);
  const fasteners = useMemo(() => generateFasteners(layout), [layout]);
  const [explode, setExplode] = useState(0);
  const [step, setStep] = useState(ASSEMBLY_STEPS.length - 1);
  const [showNails, setShowNails] = useState(false);
  const [exportHardware, setExportHardware] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<[number, number, number][]>([]);
  const measureRef = useRef(false);
  const [ortho, setOrtho] = useState(false);

  const L = (layout.input.length as number) / 16;
  const H = (layout.input.height as number) / 16;
  const visible = solids.filter((s) => s.assemblyStep <= step);

  const stamp = `wall-${Math.round(L)}x${Math.round(H)}`;
  const exportFasteners = exportHardware ? fasteners : [];

  const pick = (e: ThreeEvent<MouseEvent>, s: Solid) => {
    e.stopPropagation();
    if (measureRef.current) {
      const p: [number, number, number] = [e.point.x, e.point.y, e.point.z];
      setMeasurePts((pts) => (pts.length >= 2 ? [p] : [...pts, p]));
    } else {
      const long = Math.max(...s.size);
      setSelected({ id: s.id, label: s.label, lengthIn: long });
    }
  };

  const measureText = (() => {
    const [a, b] = measurePts;
    if (!a || !b) return null;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const rise = Math.abs(b[1] - a[1]);
    const run = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const elev = run > 0.01 && rise > 0.01 ? ` @ ${((Math.atan2(rise, run) * 180) / Math.PI).toFixed(1)}° elevation` : "";
    return `${formatLength(Math.round(d * 16) as Sixteenths, { feetInches: true })}${elev}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors enabled:hover:border-bp-accent enabled:hover:text-bp-accent disabled:opacity-40"
          >
            ← Step
          </button>
          <span className="bp-dim min-w-64 text-center text-[11px] uppercase tracking-widest text-bp-line">
            {step + 1}/{ASSEMBLY_STEPS.length}: {ASSEMBLY_STEPS[step]}
          </span>
          <button
            onClick={() => setStep((s) => Math.min(ASSEMBLY_STEPS.length - 1, s + 1))}
            disabled={step === ASSEMBLY_STEPS.length - 1}
            className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors enabled:hover:border-bp-accent enabled:hover:text-bp-accent disabled:opacity-40"
          >
            Step →
          </button>
        </div>
        <label className="flex items-center gap-2">
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">Explode</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
            className="w-36 accent-[var(--bp-accent)]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOrtho((v) => !v)}
            title="Toggle orthographic / perspective projection"
            className={`bp-dim rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
              ortho ? "border-bp-ok text-bp-ok" : "border-bp-line-faint text-bp-line-soft"
            }`}
          >
            {ortho ? "Ortho" : "Persp"}
          </button>
          <button
            onClick={() => setShowNails((v) => !v)}
            className={`bp-dim rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
              showNails ? "border-bp-ok text-bp-ok" : "border-bp-line-faint text-bp-line-soft"
            }`}
          >
            Nails
          </button>
          <button
            onClick={() => {
              measureRef.current = !measureRef.current;
              setMeasureMode(measureRef.current);
              setMeasurePts([]);
            }}
            className={`bp-dim rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
              measureMode ? "border-bp-ok text-bp-ok" : "border-bp-line-faint text-bp-line-soft"
            }`}
          >
            Measure
          </button>
          <ExportButton label=".glb" onClick={() => exportGLB(solids, `${stamp}.glb`, exportFasteners)} />
          <ExportButton label=".obj" onClick={() => exportOBJ(solids, `${stamp}.obj`, exportFasteners)} />
          <ExportButton
            label=".scad"
            onClick={() => exportText(generateOpenSCAD(layout, solids), `${stamp}.scad`)}
          />
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={exportHardware}
              onChange={(e) => setExportHardware(e.target.checked)}
              className="h-4 w-4 accent-[var(--bp-accent)]"
            />
            <span className="bp-dim text-[9px] uppercase tracking-widest text-bp-line-soft">
              export nails
            </span>
          </label>
        </div>
      </div>

      <div className="bp-dim flex min-h-5 items-center text-[11px] text-bp-line-soft">
        {measureMode
          ? measureText
            ? `${measureText} — click again to restart`
            : `click ${measurePts.length === 0 ? "the first" : "the second"} point on any piece`
          : selected
            ? `${selected.id} · ${selected.label} · ${formatLength(Math.round(selected.lengthIn * 16) as Sixteenths, { feetInches: true })} — click empty space to dismiss`
            : "click a piece for its name and length · drag to orbit"}
      </div>

      <div
        className="overflow-hidden rounded-sm border border-bp-line-faint"
        style={{ height: "min(64vh, 680px)", touchAction: "none", background: "var(--bp-paper-deep)" }}
      >
        <Canvas
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          onPointerMissed={() => {
            if (!measureRef.current) setSelected(null);
          }}
        >
          {ortho ? (
            <OrthographicCamera
              makeDefault
              position={[L * 0.75, H * 0.7, L * 0.9]}
              zoom={Math.max(1.5, 480 / Math.max(L, H))}
              near={-8000}
              far={8000}
            />
          ) : (
            <PerspectiveCamera
              makeDefault
              position={[L * 0.75, H * 0.7, L * 0.9]}
              fov={40}
              near={1}
              far={5000}
            />
          )}
          <ambientLight intensity={0.55} />
          <directionalLight position={[L, H * 2, L]} intensity={1.1} />
          <directionalLight position={[-L, H, -L]} intensity={0.4} />
          <group>
            {visible.map((s) => (
              <SolidMesh
                key={s.id}
                solid={s}
                explode={explode}
                selected={selected?.id === s.id}
                onPick={pick}
              />
            ))}
            {showNails &&
              fasteners.map((f) => (
                <mesh
                  key={f.id}
                  position={f.position}
                  rotation={
                    f.axis === "x" ? [0, 0, Math.PI / 2] : f.axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]
                  }
                >
                  <cylinderGeometry args={[f.radius * 3, f.radius * 3, f.length, 8]} />
                  <meshStandardMaterial color="#c3ccd6" metalness={0.65} roughness={0.35} />
                </mesh>
              ))}
            {measurePts.length === 2 && (
              <Line points={measurePts} color="#7fd8a4" lineWidth={2.5} />
            )}
            {measurePts.map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.9, 12, 12]} />
                <meshBasicMaterial color="#7fd8a4" />
              </mesh>
            ))}
          </group>
          <gridHelper
            args={[Math.max(L, H) * 2, Math.round((Math.max(L, H) * 2) / 12), "#2c5f8a", "#16395c"]}
            position={[L / 2, -1, 0]}
          />
          <OrbitControls key={ortho ? "ortho" : "persp"} target={[L / 2, H / 2, 0]} enableDamping makeDefault />
        </Canvas>
      </div>
      <p className="bp-dim text-[10px] text-bp-line-soft">
        Nails are drawn oversized (3×) so they read at wall scale — counts and joints follow the
        fastening schedule. Exports: .glb/.obj open in Blender (check &quot;export nails&quot; to
        include hardware); .scad opens in OpenSCAD.
      </p>
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors hover:bg-bp-accent hover:text-bp-paper-deep"
    >
      {label}
    </button>
  );
}
