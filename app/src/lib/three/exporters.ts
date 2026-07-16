"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import type { Solid } from "./solids";
import type { FastenerSolid } from "./fasteners";

/** Build a plain THREE.Group (no React) from solids, grouped by role. */
export function solidsToGroup(solids: Solid[], fasteners: FastenerSolid[] = []): THREE.Group {
  const root = new THREE.Group();
  root.name = "wall-frame";
  const byRole = new Map<string, THREE.Group>();

  for (const s of solids) {
    let roleGroup = byRole.get(s.role);
    if (!roleGroup) {
      roleGroup = new THREE.Group();
      roleGroup.name = s.role;
      byRole.set(s.role, roleGroup);
      root.add(roleGroup);
    }
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...s.size),
      new THREE.MeshStandardMaterial({ color: 0xc9a36a }),
    );
    mesh.name = `${s.id} ${s.label}`;
    mesh.position.set(...s.position);
    roleGroup.add(mesh);
  }

  if (fasteners.length > 0) {
    const hw = new THREE.Group();
    hw.name = "fasteners";
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.6, roughness: 0.4 });
    for (const f of fasteners) {
      const geo = new THREE.CylinderGeometry(f.radius, f.radius, f.length, 8);
      const mesh = new THREE.Mesh(geo, mat);
      if (f.axis === "x") mesh.rotation.z = Math.PI / 2;
      if (f.axis === "z") mesh.rotation.x = Math.PI / 2;
      mesh.position.set(...f.position);
      mesh.name = `${f.id} ${f.joint}`;
      hw.add(mesh);
    }
    root.add(hw);
  }
  return root;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportGLB(solids: Solid[], filename: string, fasteners: FastenerSolid[] = []) {
  const group = solidsToGroup(solids, fasteners);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(group, { binary: true });
  download(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }), filename);
}

export function exportOBJ(solids: Solid[], filename: string, fasteners: FastenerSolid[] = []) {
  const group = solidsToGroup(solids, fasteners);
  const exporter = new OBJExporter();
  const text = exporter.parse(group);
  download(new Blob([text], { type: "text/plain" }), filename);
}

export function exportText(text: string, filename: string, mime = "text/plain") {
  download(new Blob([text], { type: mime }), filename);
}
