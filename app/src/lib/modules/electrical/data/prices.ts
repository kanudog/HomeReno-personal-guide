import type { BreakerType, CableType } from "../types";

/**
 * Default unit prices in cents — editable ballparks (Raleigh-area big box,
 * mid-2026). The UI lets these be overridden per project.
 */

/** NM-B spool prices by sold length (feet). */
export const CABLE_SPOOL_PRICES_CENTS: Record<CableType, Record<number, number>> = {
  "14/2": { 25: 1850, 50: 3250, 100: 5450, 250: 11900 },
  "14/3": { 25: 2650, 50: 4850, 100: 8250, 250: 17900 },
  "12/2": { 25: 2350, 50: 4250, 100: 7150, 250: 15900 },
  "12/3": { 25: 3450, 50: 6250, 100: 10900, 250: 23900 },
  "10/2": { 25: 3950, 50: 6950, 100: 12500, 250: 27900 },
  "10/3": { 25: 5450, 50: 9950, 100: 17900, 250: 39900 },
  "8/3": { 25: 8900, 50: 15900, 100: 28900, 250: 64900 },
  "6/3": { 25: 12900, 50: 23900, 100: 44900, 250: 99900 },
};

/** Spool sizes sold, ascending. */
export const CABLE_SPOOL_SIZES_FT = [25, 50, 100, 250] as const;

/** Single-pole breaker prices by type (per unit; 2-pole ≈ 2.2×). */
export const BREAKER_PRICES_CENTS: Record<BreakerType, number> = {
  standard: 899,
  gfci: 4900,
  afci: 4500,
  "dual-function": 5900,
};

export const WALL_PLATE_PRICES_CENTS: Record<"duplex" | "decora" | "toggle", number> = {
  duplex: 99,
  decora: 129,
  toggle: 99,
};

/** Wire nuts by size — sold in small packs. */
export const WIRE_NUT_PACK: { count: number; priceCents: number } = {
  count: 25,
  priceCents: 549,
};

/** NM staples, box of 100 (support ≤ 4.5' apart and ≤ 8-12" from boxes). */
export const STAPLE_BOX: { count: number; priceCents: number } = {
  count: 100,
  priceCents: 449,
};

/** "GFCI Protected" / "Protected by AFCI" label sheet. */
export const GFCI_LABELS_PRICE_CENTS = 299;
