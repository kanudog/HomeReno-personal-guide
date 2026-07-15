import { NAILING_RULES } from "../data/nailingRules";
import type { NailingEntry, StudLayout } from "../types";

/** Compute fastener counts for each joint type from the actual layout. */
export function generateNailingSchedule(layout: StudLayout): NailingEntry[] {
  const m = layout.members;
  const count = (pred: (role: string) => boolean) => m.filter((x) => pred(x.role)).length;

  const fullHeightStuds = count(
    (r) => r === "stud-common" || r === "stud-king" || r === "stud-corner",
  );
  const jacks = count((r) => r === "stud-jack");
  const cripplesAbove = count((r) => r === "cripple-above");
  const cripplesBelow = count((r) => r === "cripple-below");
  const sills = count((r) => r === "sill");
  const headerPlies = count((r) => r === "header-ply");
  const plateEnds = layout.input.topPlate === "double" ? 2 : 1; // bottom + top(s) per stud
  const wallFeet = Math.ceil((layout.input.length as number) / 192);

  const blocks = count((r) => r === "blocking");
  const corners = count((r) => r === "stud-corner");

  const joints: Record<string, number> = {
    // each full-height stud is end-nailed at the bottom plate and the top plate
    "stud-to-plate-end": fullHeightStuds * 2,
    "jack-to-king": jacks,
    "header-to-king": layout.roughOpenings.length * 2,
    "header-ply": headerPlies > 1 ? layout.roughOpenings.length : 0,
    // above-header cripples: header + top plate; below-sill: plate + sill
    "cripple-to-plate": (cripplesAbove + cripplesBelow) * 2,
    "sill-to-jack": sills * 2,
    "plate-to-plate": plateEnds === 2 ? wallFeet * 2 : 0, // ~per 24" OC over wall length
    blocking: blocks,
    "corner-studs": corners,
  };

  return NAILING_RULES.map((rule) => ({
    joint: rule.joint,
    fastener: rule.fastener,
    pattern: rule.pattern,
    count: (joints[rule.jointKey] ?? 0) * rule.nailsPerJoint,
    codeRef: rule.codeRef,
  })).filter((e) => e.count > 0);
}
