import { formatLength, inches, type Sixteenths } from "@/lib/units";
import type { FramingMember, StudLayout } from "../../framing/types";

/**
 * Stud-aware box placement + cable routing on a framed wall (the optional
 * framing-integration layer). Pure: (framing layout, marked devices) →
 * snapped box positions, bore holes, and drilling guidance.
 *
 * Boring rule of thumb baked in: 3/4" holes centered in the stud depth —
 * in a 2x4 that leaves 1 3/8" to each face, clearing NEC 300.4's 1 1/4"
 * minimum without nail plates. Off-center holes get the nail-plate note.
 */

/** Exterior width of a single-gang device box. */
export const BOX_FACE_W = inches(2.25);
/** Exterior height of a single-gang device box. */
export const BOX_FACE_H = inches(3.75);
/** Default bore height — lines up with receptacle-height boxes. */
export const DEFAULT_DRILL_HEIGHT = inches(14);
export const BORE_DIAMETER_IN = 0.75;

/** Verticals a box can nail to (full-height framing). */
const MOUNTABLE_ROLES = new Set(["stud-common", "stud-king", "stud-corner", "stud-jack"]);

export interface WallRouteRequest {
  deviceId: string;
  displayName: string;
  /** Requested box left edge from the wall's left end. */
  x: Sixteenths;
  /** Bottom of the box above the subfloor. */
  heightAFF: Sixteenths;
}

export interface BoreHole {
  memberId: string;
  /** Center of the member (hole center x). */
  x: Sixteenths;
  y: Sixteenths;
}

export interface WallRoute {
  deviceId: string;
  displayName: string;
  requestedX: Sixteenths;
  /** Box left edge after snapping against the nearest mountable stud. */
  snappedX: Sixteenths;
  heightAFF: Sixteenths;
  /** The stud the box nails to, and which of its sides the box sits on. */
  studId: string;
  side: "left" | "right";
  boreHoles: BoreHole[];
}

export interface WallRoutingResult {
  routes: WallRoute[];
  /** All holes across routes, deduped per stud (shared runs share holes). */
  combinedBoreHoles: BoreHole[];
  entry: "left" | "right";
  drillHeight: Sixteenths;
  warnings: string[];
  notes: string[];
}

const isVertical = (m: FramingMember) => m.orientation === "vertical";

export function routeOnWall(
  layout: StudLayout,
  requests: WallRouteRequest[],
  opts: { entry?: "left" | "right"; drillHeight?: Sixteenths } = {},
): WallRoutingResult {
  const entry = opts.entry ?? "left";
  const drillHeight = opts.drillHeight ?? DEFAULT_DRILL_HEIGHT;
  const L = layout.input.length as number;
  const warnings: string[] = [];
  const routes: WallRoute[] = [];

  const mountable = layout.members.filter((m) => isVertical(m) && MOUNTABLE_ROLES.has(m.role));
  const boreable = layout.members.filter(
    (m) =>
      isVertical(m) &&
      (m.y as number) <= (drillHeight as number) &&
      (m.y as number) + (m.h as number) >= (drillHeight as number),
  );

  for (const req of requests) {
    const reqX = req.x as number;
    if (reqX < 0 || reqX + (BOX_FACE_W as number) > L) {
      warnings.push(`${req.displayName}: requested position is outside the wall`);
      continue;
    }
    if (mountable.length === 0) {
      warnings.push(`${req.displayName}: no full-height studs to mount a box on`);
      continue;
    }

    // Candidate positions: tight against either face of every mountable stud.
    let best: { boxX: number; stud: FramingMember; side: "left" | "right" } | null = null;
    for (const stud of mountable) {
      const candidates: { boxX: number; side: "left" | "right" }[] = [
        { boxX: (stud.x as number) + (stud.w as number), side: "right" },
        { boxX: (stud.x as number) - (BOX_FACE_W as number), side: "left" },
      ];
      for (const c of candidates) {
        if (c.boxX < 0 || c.boxX + (BOX_FACE_W as number) > L) continue;
        if (
          best === null ||
          Math.abs(c.boxX - reqX) < Math.abs(best.boxX - reqX) ||
          (Math.abs(c.boxX - reqX) === Math.abs(best.boxX - reqX) && c.boxX < best.boxX)
        ) {
          best = { boxX: c.boxX, stud, side: c.side };
        }
      }
    }
    if (!best) {
      warnings.push(`${req.displayName}: no stud face leaves room for the box`);
      continue;
    }

    // The cable runs at drill height from the wall end to the box's bay.
    const bayX = entry === "left" ? best.boxX : best.boxX + (BOX_FACE_W as number);
    const [from, to] = entry === "left" ? [0, bayX] : [bayX, L];
    const holes: BoreHole[] = boreable
      .filter((m) => {
        const center = (m.x as number) + (m.w as number) / 2;
        return center > from && center < to;
      })
      .map((m) => ({
        memberId: m.id,
        x: ((m.x as number) + (m.w as number) / 2) as Sixteenths,
        y: drillHeight,
      }))
      .sort((a, b) => (a.x as number) - (b.x as number));

    // Route crossing an opening at drill height has no wood to bore.
    for (const ro of layout.roughOpenings) {
      const roL = ro.x as number;
      const roR = roL + (ro.width as number);
      const crossesX = Math.min(from, to) < roR && Math.max(from, to) > roL;
      const inY =
        (drillHeight as number) > (ro.y as number) &&
        (drillHeight as number) < (ro.y as number) + (ro.height as number);
      if (crossesX && inY) {
        warnings.push(
          `${req.displayName}: the run crosses ${ro.displayName} at drill height — route over the header (through the cripples) or change the drill height`,
        );
      }
    }

    routes.push({
      deviceId: req.deviceId,
      displayName: req.displayName,
      requestedX: req.x,
      snappedX: best.boxX as Sixteenths,
      heightAFF: req.heightAFF,
      studId: best.stud.id,
      side: best.side,
      boreHoles: holes,
    });
  }

  const combined = new Map<string, BoreHole>();
  for (const r of routes) for (const h of r.boreHoles) combined.set(h.memberId, h);
  const combinedBoreHoles = [...combined.values()].sort((a, b) => (a.x as number) - (b.x as number));

  const notes: string[] = [];
  if (routes.length > 0) {
    notes.push(
      `Bore ${BORE_DIAMETER_IN}" holes CENTERED in the stud depth at ${formatLength(drillHeight)} — centered in a 2x4 leaves 1 3/8" to each face, clearing NEC 300.4's 1 1/4" minimum. Any hole closer than 1 1/4" to a face needs a steel nail plate.`,
      `Feed the cable through the holes from the ${entry} end, staple within 8" of each box and every 4.5' along the run, and leave 12"+ of tail at every box.`,
    );
    if (routes.some((r) => Math.abs((r.heightAFF as number) - (drillHeight as number)) > inches(6))) {
      notes.push(
        "Boxes far from the drill line: run to the box's bay, then staple the cable up/down the mounting stud into the box.",
      );
    }
  }

  return { routes, combinedBoreHoles, entry, drillHeight, warnings, notes };
}
