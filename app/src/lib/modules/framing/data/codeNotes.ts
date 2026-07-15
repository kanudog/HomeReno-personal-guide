/**
 * Jurisdiction-keyed code compliance callouts. Default jurisdiction is
 * Wake County / Raleigh, NC. Notes reference the NC State Building Code:
 * Residential Code (based on the IRC with NC amendments). Always verify
 * the currently adopted edition with Wake County Inspections & Permits.
 */
export type CalloutKind = "info" | "warn" | "danger" | "tip" | "code";

export interface CodeNote {
  id: string;
  jurisdiction: string;
  trade: "framing" | "electrical" | "plumbing" | "drop-ceiling";
  kind: CalloutKind;
  title: string;
  body: string;
  ref?: string;
}

export const CODE_NOTES: CodeNote[] = [
  {
    id: "nc-wake-framing-permit",
    jurisdiction: "us-nc-wake",
    trade: "framing",
    kind: "code",
    title: "Permits — Wake County / Raleigh",
    body: "Structural work (new walls, altering load-bearing walls, new openings in bearing walls) requires a building permit. In NC, homeowners may do their own work on their own residence under the owner exemption, but inspections are still required. Non-structural partition walls in some remodels may be exempt — confirm with Wake County Inspections before skipping a permit.",
    ref: "NC GS 87-14; Wake County Permit Portal",
  },
  {
    id: "nc-wake-framing-header",
    jurisdiction: "us-nc-wake",
    trade: "framing",
    kind: "warn",
    title: "Header sizes are rule-of-thumb",
    body: "The header table in this app is a conservative single-story rule of thumb. For load-bearing openings, verify against NC Residential Code Table R602.7(1) (girder/header spans) for your actual building width, snow load, and number of floors above. When in doubt or beyond the table, use an engineered LVL sized by the supplier.",
    ref: "NCRC R602.7",
  },
  {
    id: "nc-wake-framing-bearing",
    jurisdiction: "us-nc-wake",
    trade: "framing",
    kind: "danger",
    title: "Confirm load-bearing before cutting",
    body: "Walls perpendicular to joists/trusses above, walls under girders, and walls stacking over beams or other walls are likely bearing. Removing or opening a bearing wall requires temporary shoring and usually an engineered beam. If unsure, treat it as load-bearing.",
  },
  {
    id: "nc-wake-framing-pt-plate",
    jurisdiction: "us-nc-wake",
    trade: "framing",
    kind: "code",
    title: "Pressure-treated bottom plate",
    body: "Any plate in direct contact with concrete or masonry (slab, basement floor) must be preservative-treated or naturally durable wood. Use hot-dip galvanized or stainless fasteners in PT lumber — regular steel corrodes.",
    ref: "NCRC R317.1",
  },
  {
    id: "nc-wake-framing-fireblocking",
    jurisdiction: "us-nc-wake",
    trade: "framing",
    kind: "code",
    title: "Fireblocking",
    body: "Fireblock concealed stud cavities at ceiling/floor levels and at 10' intervals, and seal penetrations (wiring, plumbing) through plates with approved materials.",
    ref: "NCRC R302.11",
  },
  {
    id: "nc-wake-framing-nailing",
    jurisdiction: "us-nc-wake",
    trade: "framing",
    kind: "code",
    title: "Fastening schedule",
    body: "The nailing schedule follows IRC/NCRC Table R602.3(1). If you use a framing nailer with clipped-head or smaller-diameter nails, check the table footnotes — counts may increase.",
    ref: "NCRC R602.3(1)",
  },
];

export function codeNotesFor(trade: CodeNote["trade"], jurisdiction = "us-nc-wake"): CodeNote[] {
  return CODE_NOTES.filter((n) => n.trade === trade && n.jurisdiction === jurisdiction);
}
