/** Orthogonal (H/V) polyline helpers for schematic-style wire routing. */

export interface Pt {
  x: number;
  y: number;
}

/**
 * SVG path through axis-aligned waypoints with rounded corners.
 * Segments must alternate horizontal/vertical; radius shrinks on short legs.
 */
export function orthoPath(pts: Pt[], r = 7): string {
  const p = pts.filter(
    (pt, i) =>
      i === 0 ||
      Math.abs(pt.x - pts[i - 1]!.x) > 0.01 ||
      Math.abs(pt.y - pts[i - 1]!.y) > 0.01,
  );
  if (p.length === 0) return "";
  if (p.length === 1) return `M ${p[0]!.x} ${p[0]!.y}`;

  let d = `M ${p[0]!.x} ${p[0]!.y}`;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    const c = p[i + 1]!;
    const ab = Math.hypot(b.x - a.x, b.y - a.y);
    const bc = Math.hypot(c.x - b.x, c.y - b.y);
    const rr = Math.min(r, ab / 2, bc / 2);
    if (rr < 0.75) {
      d += ` L ${b.x} ${b.y}`;
      continue;
    }
    const inX = b.x - Math.sign(b.x - a.x) * rr;
    const inY = b.y - Math.sign(b.y - a.y) * rr;
    const outX = b.x + Math.sign(c.x - b.x) * rr;
    const outY = b.y + Math.sign(c.y - b.y) * rr;
    d += ` L ${inX} ${inY} Q ${b.x} ${b.y} ${outX} ${outY}`;
  }
  d += ` L ${p[p.length - 1]!.x} ${p[p.length - 1]!.y}`;
  return d;
}

/** Axis-aligned re-identification tape rect on the segment ending a route. */
export function tapeOnLastSegment(pts: Pt[]): { x: number; y: number; w: number; h: number } | null {
  if (pts.length < 2) return null;
  const a = pts[pts.length - 2]!;
  const b = pts[pts.length - 1]!;
  const horizontal = Math.abs(b.y - a.y) < 0.01;
  if (horizontal) {
    const dir = Math.sign(b.x - a.x) || 1;
    return { x: b.x - dir * 30 - (dir > 0 ? 0 : 17), y: b.y - 5.5, w: 17, h: 11 };
  }
  const dir = Math.sign(b.y - a.y) || 1;
  return { x: b.x - 5.5, y: b.y - dir * 30 - (dir > 0 ? 0 : 17), w: 11, h: 17 };
}
