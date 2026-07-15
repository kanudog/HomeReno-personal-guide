import { inches, type Sixteenths } from "@/lib/units";
import { LUMBER_DIMS } from "./lumber";
import type { HeaderSpec, LumberSize } from "../types";

/**
 * Rule-of-thumb header sizing for single-story load-bearing walls
 * (IRC-style conservative defaults; verify against IRC R602.7 tables
 * for your actual loads). Table-driven so it stays editable.
 */
interface HeaderRule {
  maxSpan: Sixteenths;
  size: LumberSize;
}

const LOAD_BEARING_RULES: HeaderRule[] = [
  { maxSpan: inches(48), size: "2x6" },
  { maxSpan: inches(60), size: "2x8" },
  { maxSpan: inches(72), size: "2x10" },
  { maxSpan: inches(84), size: "2x12" },
];

export function sizeHeader(span: Sixteenths, loadBearing: boolean): HeaderSpec {
  if (!loadBearing) {
    // Non-structural: a flat 2x4 closes the opening.
    return {
      size: "2x4",
      plies: 1,
      orientation: "flat",
      depth: LUMBER_DIMS["2x4"].thickness,
    };
  }

  for (const rule of LOAD_BEARING_RULES) {
    if ((span as number) <= (rule.maxSpan as number)) {
      return {
        size: rule.size,
        plies: 2,
        orientation: "vertical",
        depth: LUMBER_DIMS[rule.size].width,
        spacerNote:
          '1/2" plywood spacer between plies to match 3 1/2" wall depth',
      };
    }
  }

  // Beyond the table — needs an engineered header (LVL etc.).
  return {
    size: "2x12",
    plies: 2,
    orientation: "vertical",
    depth: LUMBER_DIMS["2x12"].width,
    spacerNote: '1/2" plywood spacer between plies',
    engineered: true,
  };
}
