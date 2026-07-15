import { formatLength, type Sixteenths } from "@/lib/units";
import type { AssemblyTask, CutItem, StudLayout } from "../types";

/**
 * Assembly steps mirror the 3D step-through:
 *   0 plates · 1 full-height studs (commons + kings + corners) · 2 jacks
 *   3 headers · 4 cripples above · 5 sills + cripples below
 *   6 fire blocking · 7 raise + cap plate
 * (Step numbers are shared with `layoutToSolids` — keep in sync.)
 */
export const ASSEMBLY_STEPS = [
  "Plates cut and laid out",
  "Full-height studs nailed between plates",
  "Jack studs nailed to kings",
  "Headers assembled and set on jacks",
  "Cripples installed above headers",
  "Sills and cripples installed below windows",
  "Fire blocking installed",
  "Wall raised, plumbed, and cap plate added",
] as const;

const fmt = (v: Sixteenths) => formatLength(v, { feetInches: true });

export function generateTasks(layout: StudLayout, cutList: CutItem[]): AssemblyTask[] {
  const tasks: AssemblyTask[] = [];
  const byRole = (roles: string[]) =>
    layout.members.filter((m) => roles.includes(m.role)).map((m) => m.id);
  let seq = 0;

  const cutSummary = cutList
    .map((c) => `${c.qty}× ${c.label} — ${c.size} @ ${fmt(c.length)}`)
    .join("; ");
  tasks.push({
    seq: seq++,
    title: "Cut all pieces to length",
    detail: `Cut list: ${cutSummary}. Label each piece with its ID as you cut. Keep the pressure-treated stock for the bottom plate only.`,
    assemblyStep: null,
    memberIds: [],
    codeNoteIds: ["nc-wake-framing-permit", "nc-wake-framing-bearing", "nc-wake-framing-pt-plate"],
  });

  const gridStuds = layout.members
    .filter((m) => ["stud-common", "stud-king", "stud-corner"].includes(m.role))
    .map((m) => (m.x as number) + 12)
    .sort((a, b) => a - b);
  const marks = gridStuds.map((c) => fmt(c as Sixteenths)).join(", ");
  tasks.push({
    seq: seq++,
    title: "Lay out and mark the plates",
    detail: `Clamp bottom and top plates together, crowns aligned. Mark stud centers (X on the stud side of each line) at: ${marks}. Mark king/jack positions at each opening. The bottom plate stays CONTINUOUS through door openings for now — it's cut out after the wall is raised.`,
    assemblyStep: 0,
    memberIds: byRole(["plate-bottom", "plate-top"]),
    codeNoteIds: ["nc-wake-framing-pt-plate"],
  });

  tasks.push({
    seq: seq++,
    title: "Nail full-height studs between plates",
    detail:
      "On the deck, place studs crown-up between the plates and end-nail through each plate with 2× 16d nails per stud end. Kings and corner studs are full-height — set them now.",
    assemblyStep: 1,
    memberIds: byRole(["stud-common", "stud-king", "stud-corner"]),
    codeNoteIds: ["nc-wake-framing-nailing"],
  });

  const jackLens = [
    ...new Set(layout.members.filter((m) => m.role === "stud-jack").map((m) => fmt(m.length))),
  ].join(", ");
  if (jackLens) {
    tasks.push({
      seq: seq++,
      title: "Face-nail jacks to kings",
      detail: `Jacks (${jackLens}) sit on the bottom plate tight to each king. Face-nail to the king with 10d @ 24" staggered.`,
      assemblyStep: 2,
      memberIds: byRole(["stud-jack"]),
      codeNoteIds: ["nc-wake-framing-nailing"],
    });
  }

  for (const ro of layout.roughOpenings) {
    const spec = ro.headerSpec;
    const headerMembers = layout.members.filter(
      (m) => m.role === "header-ply" && m.openingId === ro.openingId,
    );
    if (headerMembers.length === 0) continue;
    const len = headerMembers[0]!.length;
    tasks.push({
      seq: seq++,
      title: `Build and set the header (${ro.displayName})`,
      detail:
        spec.orientation === "flat"
          ? `Non-load-bearing: lay a flat ${spec.size} @ ${fmt(len)} on the jacks and end-nail through the kings.`
          : `Nail ${spec.plies} plies of ${spec.size} @ ${fmt(len)}${spec.spacerNote ? ` with ${spec.spacerNote}` : ""}, 16d @ 16" OC staggered both faces. Set on the jacks; end-nail through kings with 4× 16d per end.`,
      assemblyStep: 3,
      memberIds: headerMembers.map((m) => m.id),
      codeNoteIds: ["nc-wake-framing-header"],
    });
  }

  const cripplesAbove = byRole(["cripple-above"]);
  if (cripplesAbove.length > 0) {
    tasks.push({
      seq: seq++,
      title: "Install cripples above headers",
      detail:
        "Cripples continue the stud layout between header and top plate — keep them on the OC grid so sheathing edges land on wood. End-nail through the top plate; toe-nail to the header. Cripples sit ON TOP of the header — never notch or overlap it.",
      assemblyStep: 4,
      memberIds: cripplesAbove,
      codeNoteIds: ["nc-wake-framing-nailing"],
    });
  }

  const sills = byRole(["sill"]);
  if (sills.length > 0) {
    tasks.push({
      seq: seq++,
      title: "Install window sills and cripples below",
      detail:
        "Stand cripples on the bottom plate (edge cripples tight to the jacks, grid cripples on layout), then end-nail the flat sill through the jacks and down into the cripples. The window unit later sets on this sill with shims — no extra framing needed under it.",
      assemblyStep: 5,
      memberIds: [...sills, ...byRole(["cripple-below"])],
    });
  }

  const blocks = byRole(["blocking"]);
  if (blocks.length > 0) {
    tasks.push({
      seq: seq++,
      title: "Install fire blocking",
      detail:
        "Cut each block to its bay (lengths in the cut list) and install at the marked row. Rows are staggered 1 1/2\" so every block can be end-nailed with 2× 16d per end — straighten crowned studs as you go.",
      assemblyStep: 6,
      memberIds: blocks,
      codeNoteIds: ["nc-wake-framing-fireblocking"],
    });
  }

  const corners = byRole(["stud-corner"]);
  tasks.push({
    seq: seq++,
    title: "Raise, plumb, and fasten the wall",
    detail: `Raise the wall, brace it, and nail the bottom plate to the floor framing (2× 16d per joist bay${layout.input.bottomPlatePT ? "; use hot-dip galvanized fasteners in the PT plate" : ""}). Plumb both ends before final nailing.${layout.input.topPlate === "double" ? ' Add the cap plate, offsetting any splices ≥ 4\' from top-plate splices, 10d @ 24" staggered — leave corner laps open to tie into intersecting walls.' : ""}${corners.length > 0 ? ' At corners, nail the intersecting wall\'s end stud to the corner assembly with 16d @ 12" OC.' : ""} For door openings, cut the bottom plate out of the opening flush with the jacks — the model shows the plate already cut.`,
    assemblyStep: 7,
    memberIds: byRole(["plate-cap"]),
    codeNoteIds: ["nc-wake-framing-nailing", "nc-wake-framing-fireblocking"],
  });

  return tasks;
}
