"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import type { MemberRole, StudLayout } from "@/lib/modules/framing/types";
import { ASSEMBLY_STEPS } from "@/lib/modules/framing/engine/tasks";
import { layoutToSolids, type Solid } from "@/lib/three/solids";
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

function SolidMesh({ solid, explode }: { solid: Solid; explode: number }) {
  const [hover, setHover] = useState(false);
  const dir = EXPLODE_DIR[solid.role];
  const pos: [number, number, number] = [
    solid.position[0] + dir[0] * explode,
    solid.position[1] + dir[1] * explode,
    solid.position[2] + dir[2] * explode,
  ];
  return (
    <mesh
      position={pos}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={solid.size} />
      <meshStandardMaterial
        color={ROLE_COLOR[solid.role]}
        roughness={0.85}
        metalness={0}
        emissive={hover ? "#f4a261" : "#000000"}
        emissiveIntensity={hover ? 0.35 : 0}
      />
      <Edges color="#0a2138" lineWidth={1} />
    </mesh>
  );
}

export function FramingScene({ layout }: { layout: StudLayout }) {
  const solids = useMemo(() => layoutToSolids(layout), [layout]);
  const [explode, setExplode] = useState(0);
  const [step, setStep] = useState(ASSEMBLY_STEPS.length - 1);
  const [hoverInfo] = useState<string | null>(null);

  const L = (layout.input.length as number) / 16;
  const H = (layout.input.height as number) / 16;
  const visible = solids.filter((s) => s.assemblyStep <= step);

  const stamp = `wall-${Math.round(L)}x${Math.round(H)}`;

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
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
            Explode
          </span>
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
        <div className="flex gap-2">
          <ExportButton label=".glb" onClick={() => exportGLB(solids, `${stamp}.glb`)} />
          <ExportButton label=".obj" onClick={() => exportOBJ(solids, `${stamp}.obj`)} />
          <ExportButton
            label=".scad"
            onClick={() => exportText(generateOpenSCAD(layout, solids), `${stamp}.scad`)}
          />
        </div>
      </div>

      <div
        className="overflow-hidden rounded-sm border border-bp-line-faint"
        style={{ height: "min(64vh, 680px)", touchAction: "none", background: "var(--bp-paper-deep)" }}
      >
        <Canvas
          camera={{ position: [L * 0.75, H * 0.7, L * 0.9], fov: 40, near: 1, far: 5000 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          onCreated={({ camera }) => camera.lookAt(L / 2, H / 2, 0)}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[L, H * 2, L]} intensity={1.1} />
          <directionalLight position={[-L, H, -L]} intensity={0.4} />
          <group>
            {visible.map((s) => (
              <SolidMesh key={s.id} solid={s} explode={explode} />
            ))}
          </group>
          {/* floor reference grid, 12" squares */}
          <gridHelper
            args={[Math.max(L, H) * 2, Math.round((Math.max(L, H) * 2) / 12), "#2c5f8a", "#16395c"]}
            position={[L / 2, -1, 0]}
          />
          <OrbitControls target={[L / 2, H / 2, 0]} enableDamping makeDefault />
        </Canvas>
      </div>
      {hoverInfo && <p className="bp-dim text-[11px] text-bp-line-soft">{hoverInfo}</p>}
      <p className="bp-dim text-[10px] text-bp-line-soft">
        Drag to orbit · pinch/scroll to zoom · two-finger drag to pan. Exports: .glb/.obj open in
        Blender; .scad opens in OpenSCAD (parametric, commented per member).
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
