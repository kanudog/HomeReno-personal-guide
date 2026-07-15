import type { ResolvedOpening, WallInput } from "@/lib/modules/framing/types";
import { ocGridCenters } from "@/lib/modules/framing/engine/layout";

export type SnapKind = "grid" | "oc-grid" | "ro-edge" | "midpoint" | "wall-clearance";

export interface SnapResult {
  /** Snapped opening offset (RO left edge, sixteenths). */
  offset: number;
  /** Model-x of the guide line to highlight (RO left or right edge). */
  guideX: number | null;
  kind: SnapKind;
}

export interface SnapContext {
  wall: WallInput;
  /** RO width of the opening being dragged. */
  roWidth: number;
  /** Openings not being dragged (for edge alignment). */
  others: ResolvedOpening[];
  /** Snap radius in model units. */
  tolerance: number;
  /** Base grid increment in sixteenths (zoom-dependent). */
  gridIncrement: number;
}

interface Candidate {
  offset: number;
  guideX: number | null;
  kind: SnapKind;
  distance: number;
}

/**
 * Snap a raw drag offset. Magnetic targets (OC grid, other RO edges,
 * wall midpoint, minimum end clearance) win over the plain grid.
 */
export function snapOffset(rawOffset: number, ctx: SnapContext): SnapResult {
  const L = ctx.wall.length as number;
  const w = ctx.roWidth;
  const max = L - w;
  const clamped = Math.min(Math.max(rawOffset, 0), Math.max(0, max));

  const magnetic: Candidate[] = [];
  const consider = (offset: number, guideX: number | null, kind: SnapKind) => {
    if (offset < 0 || offset > max) return;
    const distance = Math.abs(offset - clamped);
    if (distance <= ctx.tolerance) magnetic.push({ offset, guideX, kind, distance });
  };

  // OC grid lines: land the RO left or right edge on a stud-center line
  for (const g of ocGridCenters(ctx.wall)) {
    consider(g, g, "oc-grid");
    consider(g - w, g, "oc-grid");
  }

  // other openings: align edges (equal reveals / shared trimmer lines)
  for (const o of ctx.others) {
    const ox = o.x as number;
    const ow = o.width as number;
    consider(ox, ox, "ro-edge"); // left edges aligned
    consider(ox + ow - w, ox + ow, "ro-edge"); // right edges aligned
    consider(ox + ow, ox + ow, "ro-edge"); // butt to its right edge
    consider(ox - w, ox, "ro-edge"); // butt to its left edge
  }

  // centered on the wall
  consider((L - w) / 2, L / 2, "midpoint");

  // minimum king+jack clearance from wall ends (3")
  consider(48, 48, "wall-clearance");
  consider(max - 48, L - 48, "wall-clearance");

  if (magnetic.length > 0) {
    magnetic.sort((a, b) => a.distance - b.distance);
    const best = magnetic[0]!;
    return {
      offset: Math.round(best.offset),
      guideX: best.guideX,
      kind: best.kind,
    };
  }

  const snapped = Math.round(clamped / ctx.gridIncrement) * ctx.gridIncrement;
  return {
    offset: Math.min(Math.max(snapped, 0), Math.max(0, max)),
    guideX: null,
    kind: "grid",
  };
}

/** Pick the grid increment (in sixteenths) for the current pixels-per-sixteenth. */
export function gridIncrementFor(pxPerSixteenth: number): number {
  // finest increment whose step is at least ~7px on screen
  for (const inc of [1, 4, 16]) {
    if (inc * pxPerSixteenth >= 7) return inc;
  }
  return 16; // 1" fallback when zoomed way out
}
