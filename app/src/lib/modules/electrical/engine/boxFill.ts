import type { Awg, BoxFillLine, BoxFillResult, QuarterIn3, WorkType } from "../types";
import { ALLOWANCE_BY_AWG } from "../data/boxFill";
import { BOXES, type BoxSpec } from "../data/boxes";

export interface BoxFillParams {
  /** Insulated conductors entering the box (pigtails cut inside: excluded). */
  insulatedByAwg: Partial<Record<Awg, number>>;
  /** Equipment grounding conductors entering the box. */
  egcCount: number;
  egcAwg: Awg;
  /** Device yokes and the largest conductor landing on a device. */
  deviceYokes: number;
  deviceAwg: Awg;
  /** Box has internal cable clamps (allowance of largest conductor present). */
  clamps: boolean;
}

const q = (n: number) => n as QuarterIn3;

function largestAwg(params: BoxFillParams): Awg {
  // Smaller AWG number = larger conductor.
  const gauges = Object.keys(params.insulatedByAwg).map(Number) as Awg[];
  gauges.push(params.egcAwg);
  return Math.min(...gauges) as Awg;
}

/** NEC 314.16(B) box fill for one box. See data/boxFill.ts for the rules. */
export function computeBoxFill(params: BoxFillParams, box: BoxSpec): BoxFillResult {
  const lines: BoxFillLine[] = [];

  for (const [awgKey, count] of Object.entries(params.insulatedByAwg)) {
    if (!count) continue;
    const awg = Number(awgKey) as Awg;
    const unit = ALLOWANCE_BY_AWG[awg];
    lines.push({
      label: `${awg} AWG insulated conductors`,
      count,
      unitAllowance: unit,
      total: q((unit as number) * count),
    });
  }

  if (params.egcCount > 0) {
    const unit = ALLOWANCE_BY_AWG[params.egcAwg];
    // One allowance covers up to four EGCs; each beyond four adds a quarter
    // allowance (rounded up to keep quarter-in³ integers — conservative).
    const extra = Math.max(0, params.egcCount - 4);
    const total = q((unit as number) + extra * Math.ceil((unit as number) / 4));
    lines.push({
      label: `Equipment grounds (${params.egcCount}, counted as one${extra > 0 ? ` + ${extra}/4` : ""})`,
      count: 1,
      unitAllowance: unit,
      total,
    });
  }

  if (params.clamps) {
    const unit = ALLOWANCE_BY_AWG[largestAwg(params)];
    lines.push({ label: "Internal cable clamps", count: 1, unitAllowance: unit, total: unit });
  }

  if (params.deviceYokes > 0) {
    const unit = ALLOWANCE_BY_AWG[params.deviceAwg];
    lines.push({
      label: "Device (counts double)",
      count: params.deviceYokes,
      unitAllowance: q((unit as number) * 2),
      total: q((unit as number) * 2 * params.deviceYokes),
    });
  }

  const totalFill = q(lines.reduce((sum, l) => sum + (l.total as number), 0));
  const pass = (totalFill as number) <= (box.capacity as number);

  return {
    boxId: box.id,
    boxLabel: box.label,
    lines,
    totalFill,
    capacity: box.capacity,
    pass,
    suggestedBoxId: pass ? undefined : suggestBox(totalFill, box)?.id,
  };
}

/** Smallest catalog box that fits `fill` — same gang count preferred. */
function suggestBox(fill: QuarterIn3, like: BoxSpec): BoxSpec | undefined {
  const fits = BOXES.filter(
    (b) =>
      b.kind === like.kind &&
      b.workTypes.some((w) => like.workTypes.includes(w)) &&
      (b.capacity as number) >= (fill as number),
  );
  fits.sort(
    (a, b) =>
      Number(a.gangs !== like.gangs) - Number(b.gangs !== like.gangs) ||
      (a.capacity as number) - (b.capacity as number),
  );
  return fits[0];
}

/**
 * Pick the smallest catalog box that passes fill for the given work type.
 * Falls back to the largest compatible box when nothing passes.
 */
export function pickBox(
  params: BoxFillParams,
  workType: WorkType,
  boxKind: "device" | "ceiling" | "ceiling-fan" = "device",
  gangs = 1,
): { box: BoxSpec; result: BoxFillResult } {
  const kind = boxKind === "device" ? "device" : "ceiling";
  const wantFan = boxKind === "ceiling-fan";
  const candidates = BOXES.filter(
    (b) =>
      b.gangs === gangs &&
      b.kind === kind &&
      !!b.fanRated === wantFan &&
      b.workTypes.includes(workType),
  );
  let fallback: { box: BoxSpec; result: BoxFillResult } | null = null;
  for (const box of candidates) {
    const result = computeBoxFill({ ...params, clamps: box.hasClamps }, box);
    if (result.pass) return { box, result };
    if (!fallback || (box.capacity as number) > (fallback.box.capacity as number)) {
      fallback = { box, result };
    }
  }
  if (!fallback) throw new Error(`No catalog box for workType=${workType} gangs=${gangs}`);
  return fallback;
}
