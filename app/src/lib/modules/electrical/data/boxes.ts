import type { QuarterIn3, WorkType } from "../types";

/** Brand-and-assert an integer quarter-in³ volume. */
export function qin3(n: number): QuarterIn3 {
  if (!Number.isInteger(n)) throw new Error(`Not an integer quarter-in³ value: ${n}`);
  return n as QuarterIn3;
}

/** Cubic inches (0.25 granular) → quarter-in³. */
export function fromIn3(cubicInches: number): QuarterIn3 {
  return qin3(Math.round(cubicInches * 4));
}

export function formatIn3(v: QuarterIn3): string {
  const whole = Math.floor((v as number) / 4);
  const rem = (v as number) % 4;
  const frac = rem === 0 ? "" : rem === 1 ? ".25" : rem === 2 ? ".5" : ".75";
  return `${whole}${frac} in³`;
}

export interface BoxSpec {
  id: string;
  label: string;
  gangs: number;
  kind: "device" | "ceiling";
  /** Listed for fan support (NEC 314.27(C)) — required for ceiling fans. */
  fanRated?: boolean;
  capacity: QuarterIn3;
  workTypes: WorkType[];
  /**
   * Integral NM cable clamps present → one clamp allowance in box fill
   * (NEC 314.16(B)(2)). Single-gang nail-on boxes with tension slots
   * don't count; old-work boxes with swing-in clamp tabs do.
   */
  hasClamps: boolean;
  priceCents: number;
  shoppingQuery: string;
}

/**
 * Catalog ordered smallest-first per (gangs, workType family) so the
 * engine's "smallest passing box" pick is a simple scan.
 */
export const BOXES: BoxSpec[] = [
  {
    id: "1g-nw-18",
    label: '1-gang new-work nail-on, 18 in³',
    gangs: 1,
    kind: "device",
    capacity: fromIn3(18),
    workTypes: ["new-work"],
    hasClamps: false,
    priceCents: 89,
    shoppingQuery: "single gang new work nail on box 18 cu in",
  },
  {
    id: "1g-nw-20",
    label: '1-gang new-work nail-on, 20 in³',
    gangs: 1,
    kind: "device",
    capacity: fromIn3(20),
    workTypes: ["new-work"],
    hasClamps: false,
    priceCents: 129,
    shoppingQuery: "single gang new work nail on box 20 cu in",
  },
  {
    id: "1g-nw-22",
    label: '1-gang new-work nail-on, 22.5 in³',
    gangs: 1,
    kind: "device",
    capacity: fromIn3(22.5),
    workTypes: ["new-work"],
    hasClamps: false,
    priceCents: 159,
    shoppingQuery: "single gang new work deep box 22.5 cu in",
  },
  {
    id: "1g-ow-14",
    label: '1-gang old-work, 14 in³',
    gangs: 1,
    kind: "device",
    capacity: fromIn3(14),
    workTypes: ["old-work", "existing-box"],
    hasClamps: true,
    priceCents: 219,
    shoppingQuery: "single gang old work box 14 cu in",
  },
  {
    id: "1g-ow-20",
    label: '1-gang old-work, 20 in³',
    gangs: 1,
    kind: "device",
    capacity: fromIn3(20),
    workTypes: ["old-work", "existing-box"],
    hasClamps: true,
    priceCents: 279,
    shoppingQuery: "single gang old work box 20 cu in",
  },
  {
    id: "2g-nw-34",
    label: '2-gang new-work nail-on, 34 in³',
    gangs: 2,
    kind: "device",
    capacity: fromIn3(34),
    workTypes: ["new-work"],
    hasClamps: false,
    priceCents: 279,
    shoppingQuery: "2 gang new work nail on box 34 cu in",
  },
  {
    id: "2g-ow-25",
    label: '2-gang old-work, 25 in³',
    gangs: 2,
    kind: "device",
    capacity: fromIn3(25),
    workTypes: ["old-work", "existing-box"],
    hasClamps: true,
    priceCents: 429,
    shoppingQuery: "2 gang old work box 25 cu in",
  },
  {
    id: "rd-nw-21",
    label: 'Round new-work ceiling box, 21 in³',
    gangs: 1,
    kind: "ceiling",
    capacity: fromIn3(21),
    workTypes: ["new-work"],
    hasClamps: false,
    priceCents: 229,
    shoppingQuery: "round ceiling electrical box new work 21 cu in",
  },
  {
    id: "rd-ow-15",
    label: 'Round old-work ceiling box, 15.5 in³',
    gangs: 1,
    kind: "ceiling",
    capacity: fromIn3(15.5),
    workTypes: ["old-work", "existing-box"],
    hasClamps: true,
    priceCents: 349,
    shoppingQuery: "round old work ceiling box",
  },
  {
    id: "fan-nw-15",
    label: 'Fan-rated new-work ceiling box, 15.5 in³',
    gangs: 1,
    kind: "ceiling",
    fanRated: true,
    capacity: fromIn3(15.5),
    workTypes: ["new-work"],
    hasClamps: false,
    priceCents: 1299,
    shoppingQuery: "ceiling fan rated electrical box new work",
  },
  {
    id: "fan-ow-14",
    label: 'Fan-rated old-work brace box, 14 in³',
    gangs: 1,
    kind: "ceiling",
    fanRated: true,
    capacity: fromIn3(14),
    workTypes: ["old-work", "existing-box"],
    hasClamps: true,
    priceCents: 2499,
    shoppingQuery: "ceiling fan brace box old work",
  },
];

export function boxById(id: string): BoxSpec | undefined {
  return BOXES.find((b) => b.id === id);
}
