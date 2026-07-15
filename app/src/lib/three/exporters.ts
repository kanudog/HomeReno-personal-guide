"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import type { Solid } from "./solids";

/** Build a plain THREE.Group (no React) from solids, grouped by role. */
export function solidsToGroup(solids: Solid[]): THREE.Group {
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

export async function exportGLB(solids: Solid[], filename: string) {
  const group = solidsToGroup(solids);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(group, { binary: true });
  download(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }), filename);
}

export function exportOBJ(solids: Solid[], filename: string) {
  const group = solidsToGroup(solids);
  const exporter = new OBJExporter();
  const text = exporter.parse(group);
  download(new Blob([text], { type: "text/plain" }), filename);
}

export function exportText(text: string, filename: string, mime = "text/plain") {
  download(new Blob([text], { type: mime }), filename);
}
