import { LUMBER_DIMS } from "@/lib/modules/framing/data/lumber";
import type { MemberRole, StudLayout } from "@/lib/modules/framing/types";

/**
 * Single geometry source for the 3D viewer and all exporters.
 * Inches as floats here — display/export only, never persisted.
 */
export interface Solid {
  id: string;
  role: MemberRole;
  label: string;
  /** Box center, inches. x along the wall, y up, z through the wall. */
  position: [number, number, number];
  /** Box dimensions, inches. */
  size: [number, number, number];
  /** Matches tasks.ts ASSEMBLY_STEPS indices. */
  assemblyStep: number;
}

const toIn = (sixteenths: number) => sixteenths / 16;

function stepFor(role: MemberRole): number {
  switch (role) {
    case "plate-bottom":
    case "plate-top":
      return 0;
    case "stud-common":
    case "stud-king":
    case "stud-corner":
      return 1;
    case "stud-jack":
      return 2;
    case "header-ply":
      return 3;
    case "cripple-above":
      return 4;
    case "sill":
    case "cripple-below":
      return 5;
    case "blocking":
      return 6;
    case "plate-cap":
      return 7;
  }
}

/** Tiny per-face visual shrink so coplanar faces never z-fight in WebGL. */
const EPS = 0.03;

export function layoutToSolids(layout: StudLayout): Solid[] {
  const wallDepth = toIn(LUMBER_DIMS[layout.input.studSize].width as number); // e.g. 3.5
  const plyThickness = 1.5;
  const solids: Solid[] = [];

  for (const m of layout.members) {
    const y = toIn(m.y as number);
    const h = toIn(m.h as number);

    let sz = wallDepth;
    let cz = 0;

    if (m.role === "header-ply") {
      // plies sit at the faces of the wall with the spacer between
      sz = plyThickness;
      const isSecondPly = /-(B|2)$/.test(m.id);
      cz = (wallDepth / 2 - plyThickness / 2) * (isSecondPly ? 1 : -1);
      if (m.orientation === "flat") {
        // non-structural flat header spans the full wall depth
        sz = wallDepth;
        cz = 0;
      }
    }

    // horizontal segments minus any cutouts (door openings sawn from the plate)
    const segments: { start: number; end: number }[] = [];
    if (m.cutouts && m.cutouts.length > 0) {
      const cuts = [...m.cutouts].sort((a, b) => (a.start as number) - (b.start as number));
      let cursor = m.x as number;
      for (const c of cuts) {
        if ((c.start as number) > cursor) segments.push({ start: cursor, end: c.start as number });
        cursor = Math.max(cursor, c.end as number);
      }
      const mEnd = (m.x as number) + (m.w as number);
      if (cursor < mEnd) segments.push({ start: cursor, end: mEnd });
    } else {
      segments.push({ start: m.x as number, end: (m.x as number) + (m.w as number) });
    }

    segments.forEach((seg, i) => {
      const x = toIn(seg.start);
      const w = toIn(seg.end - seg.start);
      solids.push({
        id: segments.length > 1 ? `${m.id}~${i + 1}` : m.id,
        role: m.role,
        label: m.label,
        position: [x + w / 2, y + h / 2, cz],
        size: [Math.max(0.1, w - EPS), Math.max(0.1, h - EPS), Math.max(0.1, sz - EPS)],
        assemblyStep: stepFor(m.role),
      });
    });
  }

  return solids;
}
