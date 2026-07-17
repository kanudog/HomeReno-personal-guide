import type { Awg, QuarterIn3 } from "../types";
import { qin3 } from "./boxes";

/**
 * NEC 314.16(B) volume allowance per conductor, in quarter-in³
 * (Table 314.16(B)(1): 14 AWG 2.00 · 12 AWG 2.25 · 10 AWG 2.50 ·
 * 8 AWG 3.00 · 6 AWG 5.00 in³).
 *
 * Counting rules implemented in engine/boxFill.ts:
 *  (1) each insulated conductor entering the box: 1 allowance
 *      (pigtails cut inside the box: 0)
 *  (2) internal cable clamps, any number: 1 allowance of the largest conductor
 *  (4) each device yoke: 2 allowances of the largest conductor on the device
 *  (5) equipment grounds: 1 allowance of the largest EGC for up to four,
 *      + 1/4 allowance each beyond four (2020/2023 NEC)
 */
export const ALLOWANCE_BY_AWG: Record<Awg, QuarterIn3> = {
  14: qin3(8),
  12: qin3(9),
  10: qin3(10),
  8: qin3(12),
  6: qin3(20),
};
