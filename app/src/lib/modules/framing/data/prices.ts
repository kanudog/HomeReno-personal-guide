import type { LumberSize } from "../types";

/**
 * Default unit prices in cents — editable ballparks (Raleigh-area big box,
 * mid-2026). The UI lets these be overridden per project.
 */
export const DEFAULT_STOCK_PRICES_CENTS: Record<LumberSize, Record<number, number>> = {
  // keyed by stock length in inches
  "2x4": { 96: 398, 120: 545, 144: 675, 192: 925 },
  "2x6": { 96: 598, 120: 795, 144: 985, 192: 1350 },
  "2x8": { 96: 855, 120: 1095, 144: 1320, 192: 1795 },
  "2x10": { 96: 1195, 120: 1550, 144: 1875, 192: 2550 },
  "2x12": { 96: 1595, 120: 2050, 144: 2495, 192: 3395 },
};

/** Pressure-treated (ground-contact) — bottom plates on concrete/slab. */
export const PT_STOCK_PRICES_CENTS: Record<LumberSize, Record<number, number>> = {
  "2x4": { 96: 698, 120: 925, 144: 1125, 192: 1550 },
  "2x6": { 96: 975, 120: 1295, 144: 1575, 192: 2150 },
  "2x8": { 96: 1350, 120: 1750, 144: 2095, 192: 2850 },
  "2x10": { 96: 1850, 120: 2395, 144: 2895, 192: 3950 },
  "2x12": { 96: 2450, 120: 3150, 144: 3795, 192: 5195 },
};

export const SHIM_PACK_PRICE_CENTS = 450; // bundle of cedar shims

export const PRECUT_STUD_PRICES_CENTS: Record<LumberSize, Record<number, number>> = {
  "2x4": { 92.625: 355, 104.625: 445, 116.625: 545 },
  "2x6": { 92.625: 555, 104.625: 675, 116.625: 795 },
  "2x8": {},
  "2x10": {},
  "2x12": {},
};

/** Per-pound nail pricing (loose/small box). */
export const NAILS_PER_LB: Record<string, number> = {
  '16d common (3 1/2")': 45,
  '10d common (3")': 65,
  '8d common (2 1/2")': 100,
};

export const NAIL_PRICE_PER_LB_CENTS = 250;
