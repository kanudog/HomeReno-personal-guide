"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { layoutToSolids } from "@/lib/three/solids";
import { dirRotationY, type RoomResult } from "@/lib/modules/framing/room";
import { ROLE_COLOR_3D } from "./FramingScene";

/**
 * Combined 3D of every wall in the room, each transformed into plan
 * position. The view cube snaps the camera to top / compass faces or
 * face-on to a specific wall.
 */
export function RoomScene({
  room,
  selectedWallId,
  onSelectWall,
}: {
  room: RoomResult;
  selectedWallId: string | null;
  onSelectWall: (id: string) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const wallsWithSolids = useMemo(
    () =>
      room.walls.map((w) => ({
        wall: w,
        solids: layoutToSolids(w.output.layout),
        rotation: dirRotationY(w.dir),
        position: [w.origin[0] / 16, 0, w.origin[1] / 16] as [number, number, number],
      })),
    [room],
  );

  // room bounds for camera framing
  const { center, radius } = useMemo(() => {
    const box = new THREE.Box3();
    for (const w of room.walls) {
      const [sx, sy] = w.drawnStart;
      box.expandByPoint(new THREE.Vector3(sx / 16, 0, sy / 16));
      const len = w.plan.length as number;
      const ends: Record<string, [number, number]> = {
        E: [sx + len, sy],
        W: [sx - len, sy],
        S: [sx, sy + len],
        N: [sx, sy - len],
      };
      const end = ends[w.dir]!;
      box.expandByPoint(new THREE.Vector3(end[0] / 16, (w.plan.template.height as number) / 16, end[1] / 16));
    }
    const c = new THREE.Vector3();
    box.getCenter(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    return { center: c, radius: Math.max(size.x, size.y, size.z, 60) };
  }, [room]);

  const [initialCam] = useState<[number, number, number]>([
    center.x + radius * 1.1,
    radius * 0.9,
    center.z + radius * 1.1,
  ]);

  const snapTo = (dirVec: [number, number, number]) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object;
    const d = radius * 1.6;
    cam.position.set(center.x + dirVec[0] * d, center.y + dirVec[1] * d, center.z + dirVec[2] * d);
    controls.target.copy(center);
    controls.update();
  };

  const FACES: { label: string; v: [number, number, number] }[] = [
    { label: "TOP", v: [0, 1, 0.001] },
    { label: "N", v: [0, 0.25, -1] },
    { label: "S", v: [0, 0.25, 1] },
    { label: "E", v: [1, 0.25, 0] },
    { label: "W", v: [-1, 0.25, 0] },
  ];
  const WALL_FACE: Record<string, [number, number, number]> = {
    E: [0, 0.2, 1], // wall runs east → look from the south
    S: [1, 0.2, 0],
    W: [0, 0.2, -1],
    N: [-1, 0.2, 0],
  };

  return (
    <div className="relative">
      <div
        className="overflow-hidden rounded-sm border border-bp-line-faint"
        style={{ height: "min(60vh, 640px)", touchAction: "none", background: "var(--bp-paper-deep)" }}
      >
        <Canvas
          camera={{ position: initialCam, fov: 42, near: 1, far: 8000 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[radius, radius * 2, radius]} intensity={1.1} />
          <directionalLight position={[-radius, radius, -radius]} intensity={0.4} />
          {wallsWithSolids.map(({ wall, solids, rotation, position }) => (
            <group
              key={wall.plan.id}
              position={position}
              rotation={[0, rotation, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectWall(wall.plan.id);
              }}
            >
              {solids.map((s) => (
                <mesh key={s.id} position={s.position}>
                  <boxGeometry args={s.size} />
                  <meshStandardMaterial
                    color={ROLE_COLOR_3D[s.role]}
                    roughness={0.85}
                    emissive={wall.plan.id === selectedWallId ? "#f4a261" : "#000000"}
                    emissiveIntensity={wall.plan.id === selectedWallId ? 0.22 : 0}
                  />
                  <Edges color="#0a2138" lineWidth={1} />
                </mesh>
              ))}
            </group>
          ))}
          <gridHelper
            args={[radius * 3, Math.round((radius * 3) / 12), "#2c5f8a", "#16395c"]}
            position={[center.x, -1, center.z]}
          />
          <OrbitControls
            ref={controlsRef}
            target={[center.x, center.y, center.z]}
            enableDamping
            makeDefault
          />
        </Canvas>
      </div>

      {/* view cube */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
        <div className="grid grid-cols-3 gap-1">
          <span />
          <CubeButton label="N" onClick={() => snapTo(FACES[1]!.v)} />
          <span />
          <CubeButton label="W" onClick={() => snapTo(FACES[4]!.v)} />
          <CubeButton label="TOP" onClick={() => snapTo(FACES[0]!.v)} accent />
          <CubeButton label="E" onClick={() => snapTo(FACES[3]!.v)} />
          <span />
          <CubeButton label="S" onClick={() => snapTo(FACES[2]!.v)} />
          <span />
        </div>
        <div className="mt-1 flex max-w-44 flex-wrap justify-end gap-1">
          {room.walls.map((w) => (
            <button
              key={w.plan.id}
              onClick={() => {
                onSelectWall(w.plan.id);
                const face = WALL_FACE[w.dir];
                if (face) snapTo(face);
              }}
              className={`bp-dim rounded-sm border px-2 py-1 text-[9px] uppercase tracking-widest transition-colors ${
                w.plan.id === selectedWallId
                  ? "border-bp-accent text-bp-accent"
                  : "border-bp-line-faint text-bp-line-soft hover:text-bp-line"
              }`}
            >
              {w.plan.name.replace("Wall ", "")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CubeButton({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`bp-dim rounded-sm border px-2 py-1 text-[9px] uppercase tracking-widest transition-colors ${
        accent
          ? "border-bp-accent text-bp-accent hover:bg-bp-accent hover:text-bp-paper-deep"
          : "border-bp-line-faint bg-bp-paper-deep/80 text-bp-line-soft hover:text-bp-line"
      }`}
    >
      {label}
    </button>
  );
}
