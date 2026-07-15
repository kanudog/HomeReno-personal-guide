import type { CutItem, FramingMember, MemberRole, StudLayout } from "../types";

const GROUP_LABELS: Record<MemberRole, string> = {
  "plate-bottom": "Bottom plate",
  "plate-top": "Top plate",
  "plate-cap": "Cap plate",
  "stud-common": "Common stud",
  "stud-corner": "Corner stud",
  "stud-king": "King stud",
  "stud-jack": "Jack stud",
  "header-ply": "Header ply",
  "cripple-above": "Cripple (above header)",
  "cripple-below": "Cripple (below sill)",
  sill: "Window sill",
  blocking: "Fire block",
};

/**
 * Group identical (role, size, length, opening, treatment) members into
 * cut-list lines. Opening-owned pieces keep their opening's name so
 * "Jack stud — Window 2" reads directly against the drawings.
 */
export function generateCutList(layout: StudLayout): CutItem[] {
  const openingNames = new Map(
    layout.roughOpenings.map((ro) => [ro.openingId, ro.displayName]),
  );
  const groups = new Map<string, CutItem>();
  for (const m of layout.members) {
    const openingName = m.openingId ? openingNames.get(m.openingId) : undefined;
    const key = `${m.role}|${m.size}|${m.length}|${openingName ?? ""}|${m.treated ? "PT" : ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.qty += 1;
      existing.memberIds.push(m.id);
    } else {
      groups.set(key, {
        label:
          GROUP_LABELS[m.role] +
          (openingName ? ` — ${openingName}` : "") +
          (m.treated ? " (pressure-treated)" : ""),
        size: m.size,
        length: m.length,
        qty: 1,
        memberIds: [m.id],
        role: m.role,
        treated: m.treated,
      });
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      a.label.localeCompare(b.label) || (b.length as number) - (a.length as number),
  );
}

export function memberById(layout: StudLayout, id: string): FramingMember | undefined {
  return layout.members.find((m) => m.id === id);
}
