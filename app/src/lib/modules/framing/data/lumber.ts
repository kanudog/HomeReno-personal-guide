import { inches, type Sixteenths } from "@/lib/units";
import type { LumberSize } from "../types";

/** Nominal size → actual dressed dimensions. */
export const LUMBER_DIMS: Record<LumberSize, { thickness: Sixteenths; width: Sixteenths }> = {
  "2x4": { thickness: inches(1.5), width: inches(3.5) },
  "2x6": { thickness: inches(1.5), width: inches(5.5) },
  "2x8": { thickness: inches(1.5), width: inches(7.25) },
  "2x10": { thickness: inches(1.5), width: inches(9.25) },
  "2x12": { thickness: inches(1.5), width: inches(11.25) },
};

export const PLATE_THICKNESS = inches(1.5);
export const STUD_FACE = inches(1.5);

/** Purchasable stock lengths, ascending. */
export const STOCK_LENGTHS: Sixteenths[] = [
  inches(96), // 8'
  inches(120), // 10'
  inches(144), // 12'
  inches(192), // 16'
];

/**
 * Precut stud lengths sold cheaper than cutting from stock.
 * Only exact-length matches purchase these (they are never cut).
 */
export const PRECUT_STUD_LENGTHS: Sixteenths[] = [
  inches(92.625), // 8' ceilings (97 1/8" wall with double top plate)
  inches(104.625), // 9' ceilings
  inches(116.625), // 10' ceilings
];

/** Saw kerf consumed by each cut. */
export const KERF = inches(0.125);
