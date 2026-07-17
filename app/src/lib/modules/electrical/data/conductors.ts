import type { Awg, CableType, ConductorColor } from "../types";

/**
 * NM-B cable facts. Colors are listed insulated-first, ground last.
 * Sheath colors follow the modern US convention (white 14, yellow 12,
 * orange 10, black 8/6) — display + shopping only.
 */
export interface CableSpec {
  type: CableType;
  awg: Awg;
  /** Insulated conductor colors, in the order they leave the sheath. */
  insulated: ConductorColor[];
  sheathColor: string;
}

export const CABLES: Record<CableType, CableSpec> = {
  "14/2": { type: "14/2", awg: 14, insulated: ["black", "white"], sheathColor: "white" },
  "14/3": { type: "14/3", awg: 14, insulated: ["black", "red", "white"], sheathColor: "white" },
  "12/2": { type: "12/2", awg: 12, insulated: ["black", "white"], sheathColor: "yellow" },
  "12/3": { type: "12/3", awg: 12, insulated: ["black", "red", "white"], sheathColor: "yellow" },
  "10/2": { type: "10/2", awg: 10, insulated: ["black", "white"], sheathColor: "orange" },
  "10/3": { type: "10/3", awg: 10, insulated: ["black", "red", "white"], sheathColor: "orange" },
  "8/3": { type: "8/3", awg: 8, insulated: ["black", "red", "white"], sheathColor: "black" },
  "6/3": { type: "6/3", awg: 6, insulated: ["black", "red", "white"], sheathColor: "black" },
};

/**
 * Max breaker for NM-B copper (60°C column, NEC 334.80 / 240.4(D)).
 */
export const MAX_BREAKER_BY_AWG: Record<Awg, number> = {
  14: 15,
  12: 20,
  10: 30,
  8: 40,
  6: 55,
};

/** Smallest gauge acceptable for a breaker size (copper NM-B). */
export function minAwgForBreaker(amps: number): Awg | null {
  if (amps <= 15) return 14;
  if (amps <= 20) return 12;
  if (amps <= 30) return 10;
  if (amps <= 40) return 8;
  if (amps <= 55) return 6;
  return null;
}

/**
 * Wire-nut choice by splice size. Sizes are the universal color names;
 * capacities are conservative mid-range (verify against the package chart).
 */
export interface WireNutRule {
  size: string;
  /** Max conductors by gauge (pigtails count as members). */
  max: Partial<Record<Awg, number>>;
}

export const WIRE_NUT_RULES: WireNutRule[] = [
  { size: "orange", max: { 14: 2 } },
  { size: "yellow", max: { 14: 3, 12: 2 } },
  { size: "red", max: { 14: 5, 12: 4, 10: 3 } },
];

/** Pick the smallest listed nut that holds `count` conductors of `awg`. */
export function pickWireNut(count: number, awg: Awg): string | null {
  for (const rule of WIRE_NUT_RULES) {
    const cap = rule.max[awg];
    if (cap !== undefined && count <= cap) return rule.size;
  }
  return null;
}

/** Make-up constants (instruction text; lengths are conventions). */
export const STRIP = {
  /** Sheath removed inside the box; leaves 1/4" of sheath visible past the clamp. */
  sheathIn: '10"',
  /** Bare copper for a wire-nut splice. */
  wirenut: '3/4"',
  /** Bare copper for a screw-terminal hook (wrap clockwise). */
  screwHook: '5/8"',
  /** NEC 300.14: min free conductor at the box, and min past the face. */
  freeConductor: '6" free, 3" past the box face',
  /** Pigtail length cut from scrap. */
  pigtail: '6"',
} as const;
