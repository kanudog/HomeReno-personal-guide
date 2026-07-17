import type { CodeNote } from "../../framing/data/codeNotes";

/**
 * Electrical code callouts for Wake County / Raleigh, NC. The NC State
 * Electrical Code is the NEC as adopted with NC amendments — always verify
 * the currently adopted edition with Wake County Inspections & Permits.
 * (CodeNote type lives with framing for now; a shared registry can absorb
 * both when a third trade lands.)
 */
export const ELECTRICAL_CODE_NOTES: CodeNote[] = [
  {
    id: "nc-wake-elec-permit",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Permits & the NC homeowner exemption",
    body: "Electrical work (new circuits, new receptacles/switches on existing circuits, panel work) requires an electrical permit. In NC, homeowners may do their own electrical work on their own residence under the owner exemption (NC GS 87-43.1) — but a permit is still required and the work must pass inspection. Rough-in must be inspected BEFORE covering with drywall.",
    ref: "NC GS 87-43.1; Wake County Permit Portal",
  },
  {
    id: "nc-wake-elec-verify-dead",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "danger",
    title: "Verify dead before touching",
    body: "Turn off the breaker, then PROVE the circuit is dead at the box you're working in: non-contact tester first, then meter from each conductor to ground AND to neutral (expect 0V). Test your meter on a known-live circuit before and after (live-dead-live). Boxes can contain conductors from more than one circuit — test every wire in the box, not just the ones you plan to touch.",
  },
  {
    id: "nc-wake-elec-gfci-zones",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Where GFCI protection is required",
    body: "Receptacles in bathrooms, garages, outdoors, crawl spaces, basements, kitchens (countertop), within 6' of any sink, and serving laundry areas must be GFCI-protected — from a GFCI receptacle, a GFCI upstream on the LOAD side, or a GFCI breaker.",
    ref: "NEC 210.8(A)",
  },
  {
    id: "nc-wake-elec-afci",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "AFCI — NC amends the NEC here",
    body: "The full NEC requires AFCI protection for most dwelling 120V 15/20A circuits; North Carolina has historically amended 210.12 to require AFCI only for bedroom outlets. This app flags bedrooms. Verify the current NC amendment with Wake County before finalizing a panel order — a dual-function (AFCI/GFCI) breaker covers both requirements where needed.",
    ref: "NEC 210.12 (as amended by NC)",
  },
  {
    id: "nc-wake-elec-neutral-at-switch",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Neutral required at switch boxes (new work)",
    body: "New switch locations must have a grounded (neutral) conductor available — run x/3 cable for switch loops and cap the spare white. Existing 2-wire loops may remain in old work; re-identify the white with black tape at both ends. Smart switches are why this rule exists: most need that neutral.",
    ref: "NEC 404.2(C)",
  },
  {
    id: "nc-wake-elec-box-fill",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Box fill is a hard limit",
    body: "Every conductor, device, and clamp consumes cubic inches per NEC 314.16 — the app computes this per box. An overfilled box overheats and fails inspection: use the next size up (deep 22.5 in³ boxes cost a dollar more). Plastic box volumes are stamped inside the box.",
    ref: "NEC 314.16",
  },
  {
    id: "nc-wake-elec-cable-support",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Cable support & protection",
    body: "Staple NM cable within 8\" of single-gang boxes without clamps (12\" of boxes with clamps) and every 4.5' along runs. Where cable passes through studs closer than 1 1/4\" to the face, protect it with a steel nail plate.",
    ref: "NEC 334.30; 300.4",
  },
  {
    id: "nc-wake-elec-free-conductor",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Leave enough free conductor",
    body: "At least 6\" of free conductor from where the cable enters the box, and at least 3\" extending past the box face. Cut them long — short wires make every future repair miserable.",
    ref: "NEC 300.14",
  },
  {
    id: "nc-wake-elec-tamper-resistant",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Tamper-resistant receptacles",
    body: "Virtually all 15A and 20A, 125V receptacles in a dwelling must be tamper-resistant (look for the TR stamp on the face). The shopping list specifies TR devices.",
    ref: "NEC 406.12",
  },
  {
    id: "nc-wake-elec-laundry-circuit",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Laundry gets its own 20A circuit",
    body: "Laundry-area receptacles require a dedicated 20A branch circuit (12 AWG) that serves no other rooms. The washer receptacle also needs GFCI protection.",
    ref: "NEC 210.11(C)(2); 210.8(A)",
  },
  {
    id: "nc-wake-elec-receptacle-spacing",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "code",
    title: "Receptacle spacing — the 6'/12' rule",
    body: "In habitable rooms, no point along the floor line of any wall 2' or wider may be more than 6' from a receptacle — in practice: within 6' of each opening and every 12' along the wall. Kitchen counters have their own tighter rule (no point more than 24\" from a receptacle).",
    ref: "NEC 210.52(A), 210.52(C)",
  },
  {
    id: "nc-wake-elec-gfci-test",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "tip",
    title: "Test GFCIs after install (and monthly)",
    body: "After energizing, press TEST — the receptacle (and everything on its LOAD side) must go dead; RESET restores it. Confirm with the plug-in tester's GFCI button. Self-test models still want a monthly manual test.",
  },
  {
    id: "nc-wake-elec-labeling",
    jurisdiction: "us-nc-wake",
    trade: "electrical",
    kind: "tip",
    title: "Label as you go",
    body: "Update the panel directory the same day you energize a circuit, and sticker downstream receptacles that are GFCI-protected from upstream. The app prints both.",
    ref: "NEC 408.4",
  },
];

export function electricalCodeNote(id: string): CodeNote | undefined {
  return ELECTRICAL_CODE_NOTES.find((n) => n.id === id);
}
