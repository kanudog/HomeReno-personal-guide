import type { Sixteenths } from "@/lib/units";
import { LUMBER_DIMS } from "./data/lumber";
import { computeFraming } from "./index";
import { packCuts } from "./engine/binPacking";
import { generateShoppingList } from "./engine/shopping";
import type {
  CornerStyle,
  CutItem,
  FramingOutput,
  NailingEntry,
  OpeningInput,
  PackingResult,
  ShoppingLine,
  WallInput,
} from "./types";

/**
 * Room planner model: a chain of orthogonal walls drawn top-down.
 * Drawn lengths are OUTSIDE-face dimensions walking the loop clockwise.
 * At each 90° junction the incoming wall runs THROUGH (keeps full length,
 * gets corner studs) and the outgoing wall BUTTS into it (framed length
 * shortened by the wall depth, origin shifted).
 */
export type PlanDir = "E" | "S" | "W" | "N";

export interface PlanWall {
  id: string;
  name: string;
  dir: PlanDir;
  /** Drawn outside-face length. */
  length: Sixteenths;
  template: Omit<WallInput, "length" | "corners" | "openings">;
  openings: OpeningInput[];
}

export interface RoomPlan {
  walls: PlanWall[];
  /** Join the last wall back to the first (closed room). */
  closed: boolean;
  cornerStyle: Exclude<CornerStyle, "none">;
}

export const DIR_VECTOR: Record<PlanDir, [number, number]> = {
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
  N: [0, -1],
};

const turn90 = (a: PlanDir, b: PlanDir) => {
  const [ax, ay] = DIR_VECTOR[a];
  const [bx, by] = DIR_VECTOR[b];
  return ax * bx + ay * by === 0; // perpendicular
};

export interface PlacedWall {
  plan: PlanWall;
  /** Framed wall input (length shortened at butt ends, corners set). */
  input: WallInput;
  output: FramingOutput;
  /** Framed-wall origin in plan space (sixteenths) + direction. */
  origin: [number, number];
  dir: PlanDir;
  /** Drawn (unshortened) start point — for plan rendering. */
  drawnStart: [number, number];
}

export interface RoomResult {
  walls: PlacedWall[];
  warnings: string[];
  combined: {
    cutList: CutItem[];
    packing: PackingResult;
    shopping: ShoppingLine[];
    nailing: NailingEntry[];
  };
}

export function computeRoom(plan: RoomPlan): RoomResult {
  const warnings: string[] = [];
  const n = plan.walls.length;
  const placed: PlacedWall[] = [];

  // walk the chain to place drawn start points
  let cx = 0;
  let cy = 0;
  const drawnStarts: [number, number][] = [];
  for (const w of plan.walls) {
    drawnStarts.push([cx, cy]);
    const [dx, dy] = DIR_VECTOR[w.dir];
    cx += dx * (w.length as number);
    cy += dy * (w.length as number);
  }
  const loopCloses = plan.closed && n >= 3 && cx === 0 && cy === 0;
  if (plan.closed && !loopCloses && n >= 3) {
    warnings.push(
      "The walls don't return to the start point — adjust lengths to close the loop (corners at the closing joint are skipped).",
    );
  }

  for (let i = 0; i < n; i++) {
    const w = plan.walls[i]!;
    const prev = i > 0 ? plan.walls[i - 1] : loopCloses ? plan.walls[n - 1] : undefined;
    const next = i < n - 1 ? plan.walls[i + 1] : loopCloses ? plan.walls[0] : undefined;

    const depth = LUMBER_DIMS[w.template.studSize].width as number;

    // butt at start: previous wall ran through this junction
    const buttAtStart = !!prev && turn90(prev.dir, w.dir);
    // through at end: this wall runs through into the next
    const throughAtEnd = !!next && turn90(w.dir, next.dir);

    const framedLength = (w.length as number) - (buttAtStart ? depth : 0);
    const [dx, dy] = DIR_VECTOR[w.dir];
    const start = drawnStarts[i]!;
    const origin: [number, number] = buttAtStart
      ? [start[0] + dx * depth, start[1] + dy * depth]
      : [start[0], start[1]];

    const input: WallInput = {
      ...w.template,
      length: Math.max(48, framedLength) as Sixteenths,
      corners: {
        start: "none",
        end: throughAtEnd ? plan.cornerStyle : "none",
      },
      openings: w.openings,
    };

    let output: FramingOutput;
    try {
      output = computeFraming(input);
    } catch {
      warnings.push(`${w.name}: too small to frame — increase its length.`);
      continue;
    }
    placed.push({ plan: w, input, output, origin, dir: w.dir, drawnStart: start });
  }

  // combined outputs: prefix labels/ids with the wall name, then pack the
  // whole room's cuts together (cross-wall stock optimization)
  const combinedCuts: CutItem[] = placed.flatMap((p) =>
    p.output.cutList.map((c) => ({
      ...c,
      label: `${p.plan.name} · ${c.label}`,
      memberIds: c.memberIds.map((id) => `${p.plan.name}:${id}`),
    })),
  );
  const packing = packCuts(combinedCuts);
  const nailingMap = new Map<string, NailingEntry>();
  for (const p of placed) {
    for (const entry of p.output.nailing) {
      const existing = nailingMap.get(entry.joint);
      if (existing) existing.count += entry.count;
      else nailingMap.set(entry.joint, { ...entry });
    }
  }
  const nailing = [...nailingMap.values()];
  const openingCount = placed.reduce((s, p) => s + p.plan.openings.length, 0);
  const shopping = generateShoppingList(packing, nailing, openingCount);

  return { walls: placed, warnings, combined: { cutList: combinedCuts, packing, shopping, nailing } };
}

/** Rotation (radians about Y) mapping a wall's local +x to its plan direction. */
export function dirRotationY(dir: PlanDir): number {
  switch (dir) {
    case "E":
      return 0;
    case "S":
      return -Math.PI / 2;
    case "W":
      return Math.PI;
    case "N":
      return Math.PI / 2;
  }
}
