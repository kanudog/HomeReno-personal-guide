import { describe, expect, it } from "vitest";
import { inches } from "@/lib/units";
import { computeFraming } from "../index";
import { FIXTURES } from "../fixtures";
import { ocGridCenters } from "./layout";
import type { FramingMember, WallInput } from "../types";

const get = (name: keyof typeof FIXTURES) => computeFraming(FIXTURES[name]!);

const byRole = (members: FramingMember[], role: string) =>
  members.filter((m) => m.role === role);

describe("golden: plain-8ft", () => {
  const out = get("plain-8ft");

  it("has 7 studs and 3 plates", () => {
    expect(byRole(out.layout.members, "stud-common")).toHaveLength(7);
    expect(byRole(out.layout.members, "plate-bottom")).toHaveLength(1);
    expect(byRole(out.layout.members, "plate-top")).toHaveLength(1);
    expect(byRole(out.layout.members, "plate-cap")).toHaveLength(1);
    expect(out.layout.members).toHaveLength(10);
  });

  it("studs are 92 5/8 precuts on the 16 OC grid", () => {
    const studs = byRole(out.layout.members, "stud-common");
    for (const s of studs) expect(s.length).toBe(inches(92.625));
    const centers = studs.map((s) => (s.x as number) + 12).sort((a, b) => a - b);
    expect(centers).toEqual([12, 256, 512, 768, 1024, 1280, 1536 - 12].map(Number));
    expect(out.packing.precuts).toEqual([
      { size: "2x4", length: inches(92.625), qty: 7, label: "Precut stud" },
    ]);
  });

  it("packs 3 plates onto 3 × 8' boards with no waste", () => {
    expect(out.packing.boards).toHaveLength(3);
    for (const b of out.packing.boards) {
      expect(b.stockLength).toBe(inches(96));
      expect(b.waste).toBe(0);
    }
  });

  it("has no warnings", () => {
    expect(out.layout.warnings).toEqual([]);
  });
});

describe("golden: door-8ft (36x80 prehung door, load-bearing)", () => {
  const out = get("door-8ft");
  const m = out.layout.members;

  it("resolves the RO from standard tolerances", () => {
    const ro = out.layout.roughOpenings[0]!;
    expect(ro.width).toBe(inches(38)); // 36 + 2
    expect(ro.height).toBe(inches(82.5)); // 80 + 2 1/2
    expect(ro.x).toBe(inches(30));
    expect(ro.y).toBe(0);
  });

  it("sizes a 2-ply 2x6 header for a 38 inch span", () => {
    const plies = byRole(m, "header-ply");
    expect(plies).toHaveLength(2);
    expect(plies[0]!.size).toBe("2x6");
    expect(plies[0]!.length).toBe(inches(41)); // RO + 3"
    expect(plies[0]!.y).toBe(inches(82.5));
  });

  it("computes jack and cripple lengths", () => {
    const jacks = byRole(m, "stud-jack");
    expect(jacks).toHaveLength(2);
    for (const j of jacks) expect(j.length).toBe(inches(81)); // 82.5 - 1.5 plate

    const cripples = byRole(m, "cripple-above");
    expect(cripples).toHaveLength(3); // grid at 32, 48, 64
    for (const c of cripples) expect(c.length).toBe(inches(6.125)); // 94.125 - 88
  });

  it("keeps grid studs outside the opening zone", () => {
    const centers = byRole(m, "stud-common")
      .map((s) => (s.x as number) + 12)
      .sort((a, b) => a - b);
    expect(centers).toEqual([12, 256, 1280, 1536 - 12]); // ends + 16" + 80"
    expect(byRole(m, "stud-king")).toHaveLength(2);
  });

  it("buys 6 precuts (4 commons + 2 kings) and packs the rest", () => {
    expect(out.packing.precuts[0]!.qty).toBe(6);
    // 3 plates @96 + jacks/cripples across 3 more 8' boards (FFD)
    expect(out.packing.boards).toHaveLength(6);
    for (const b of out.packing.boards) expect(b.stockLength).toBe(inches(96));
    expect(out.layout.warnings).toEqual([]);
  });
});

describe("golden: window-12ft (36x48 window, sill 36)", () => {
  const out = get("window-12ft");
  const m = out.layout.members;

  it("resolves window RO with 1/2 inch tolerances and sill height", () => {
    const ro = out.layout.roughOpenings[0]!;
    expect(ro.width).toBe(inches(36.5));
    expect(ro.height).toBe(inches(48.5));
    expect(ro.y).toBe(inches(36));
  });

  it("frames the full window set", () => {
    expect(byRole(m, "stud-common")).toHaveLength(7);
    expect(byRole(m, "stud-king")).toHaveLength(2);
    expect(byRole(m, "stud-jack").map((j) => j.length)).toEqual([
      inches(83),
      inches(83),
    ]); // RO top 84.5 - 1.5
    expect(byRole(m, "sill")).toHaveLength(1);
    expect(byRole(m, "sill")[0]!.length).toBe(inches(36.5));
    expect(byRole(m, "cripple-above")).toHaveLength(2); // 64", 80" (96" would hit jack)
    expect(byRole(m, "cripple-below")).toHaveLength(4); // 2 edges + 2 grid
    for (const c of byRole(m, "cripple-below")) expect(c.length).toBe(inches(33)); // 34.5 - 1.5
    expect(m).toHaveLength(23);
    expect(out.layout.warnings).toEqual([]);
  });
});

describe("golden: partition-24oc (single top plate, non-bearing flat header)", () => {
  const out = get("partition-24oc");
  const m = out.layout.members;

  it("uses a flat 2x4 header and longer studs (no cap plate)", () => {
    const plies = byRole(m, "header-ply");
    expect(plies).toHaveLength(1);
    expect(plies[0]!.orientation).toBe("flat");
    expect(plies[0]!.h).toBe(inches(1.5));
    expect(byRole(m, "plate-cap")).toHaveLength(0);
    for (const s of byRole(m, "stud-common")) expect(s.length).toBe(inches(94.125));
  });

  it("keeps the 24 OC grid", () => {
    const centers = byRole(m, "stud-common")
      .map((s) => (s.x as number) + 12)
      .sort((a, b) => a - b);
    expect(centers).toEqual([12, inches(24) as number, inches(96) as number, inches(118.5) + 12]);
  });
});

describe("golden: wide-opening (RO override, 2x10 header row)", () => {
  const out = get("wide-opening");

  it("honors the RO override and sizes a 2x10 header", () => {
    const ro = out.layout.roughOpenings[0]!;
    expect(ro.width).toBe(inches(62));
    expect(ro.headerSpec.size).toBe("2x10");
    expect(ro.headerSpec.plies).toBe(2);
    expect(ro.headerSpec.engineered).toBeUndefined();
    expect(byRole(out.layout.members, "cripple-above")).toHaveLength(4);
    for (const c of byRole(out.layout.members, "cripple-above"))
      expect(c.length).toBe(inches(2.375)); // 94.125 - 91.75
  });
});

describe("golden: long-20ft (plate splicing)", () => {
  const out = get("long-20ft");
  const m = out.layout.members;

  it("splices plates on stud centers with cap joints offset", () => {
    const bottom = byRole(m, "plate-bottom");
    expect(bottom.map((p) => p.length)).toEqual([inches(192), inches(48)]);
    const cap = byRole(m, "plate-cap");
    expect(cap.map((p) => p.length)).toEqual([inches(144), inches(96)]);
    expect(out.layout.warnings.filter((w) => w.code === "plate-spliced")).toHaveLength(3);
  });

  it("buys 16 precuts", () => {
    expect(out.packing.precuts[0]!.qty).toBe(16);
  });
});

describe("golden: tall-9ft", () => {
  it("uses 104 5/8 precuts", () => {
    const out = get("tall-9ft");
    expect(out.packing.precuts[0]!.length).toBe(inches(104.625));
  });
});

// ---------------------------------------------------------------------------
// Invariants across all fixtures + a seeded input matrix
// ---------------------------------------------------------------------------

function invariantWalls(): WallInput[] {
  const walls: WallInput[] = Object.values(FIXTURES);
  // ugly lengths: 4' to 20' stepping 7 3/16" to land on awkward sixteenths
  for (let len = inches(48) as number; len <= (inches(240) as number); len += 115) {
    const wall: WallInput = {
      length: len as WallInput["length"],
      height: inches(97.125),
      studSize: "2x4",
      spacingOC: inches(16),
      topPlate: "double",
      loadBearing: len % 2 === 0,
    bottomPlatePT: true,
      openings: [],
    };
    // place a door if it fits with full king/jack clearance
    const roW = inches(32) as number;
    if (len > roW + 2 * 48 + 96) {
      wall.openings.push({
        id: "d",
        kind: "door",
        offset: ((48 + ((len * 7) % Math.max(1, len - roW - 96 - 48))) | 0) as WallInput["length"],
        unitWidth: inches(30),
        unitHeight: inches(80),
      });
    }
    walls.push(wall);
  }
  return walls;
}

describe("invariants", () => {
  const walls = invariantWalls();

  it("members never overlap (except stacked header plies)", () => {
    for (const wall of walls) {
      const { layout } = computeFraming(wall);
      const ms = layout.members;
      for (let i = 0; i < ms.length; i++) {
        for (let j = i + 1; j < ms.length; j++) {
          const a = ms[i]!;
          const b = ms[j]!;
          if (a.role === "header-ply" && b.role === "header-ply" && a.openingId === b.openingId)
            continue;
          const overlap =
            (a.x as number) < (b.x as number) + (b.w as number) &&
            (a.x as number) + (a.w as number) > (b.x as number) &&
            (a.y as number) < (b.y as number) + (b.h as number) &&
            (a.y as number) + (a.h as number) > (b.y as number);
          expect(
            overlap,
            `overlap ${a.id}(${a.x},${a.y},${a.w},${a.h}) vs ${b.id}(${b.x},${b.y},${b.w},${b.h}) in wall len=${wall.length}`,
          ).toBe(false);
        }
      }
    }
  });

  it("all coordinates and lengths are positive integers", () => {
    for (const wall of walls) {
      const { layout } = computeFraming(wall);
      for (const m of layout.members) {
        for (const v of [m.x, m.y, m.w, m.h, m.length]) {
          expect(Number.isInteger(v as number)).toBe(true);
        }
        expect((m.length as number) > 0).toBe(true);
        expect((m.x as number) >= 0).toBe(true);
        expect((m.x as number) + (m.w as number) <= (wall.length as number)).toBe(true);
      }
    }
  });

  it("every OC grid line is covered by a vertical member or inside an RO", () => {
    for (const wall of walls) {
      const { layout } = computeFraming(wall);
      const verticals = layout.members.filter((m) => m.orientation === "vertical");
      for (const c of ocGridCenters(wall)) {
        const covered =
          verticals.some((v) => (v.x as number) <= c && c <= (v.x as number) + (v.w as number)) ||
          layout.roughOpenings.some(
            (ro) => (ro.x as number) <= c && c <= (ro.x as number) + (ro.width as number),
          );
        expect(covered, `grid line at ${c} uncovered in wall len=${wall.length}`).toBe(true);
      }
    }
  });

  it("packing fits with kerf and never has negative waste", () => {
    for (const wall of walls) {
      const { packing } = computeFraming(wall);
      for (const b of packing.boards) {
        expect((b.waste as number) >= 0).toBe(true);
        const used =
          b.cuts.reduce((s, c) => s + (c.length as number), 0) + (b.cuts.length - 1) * 2;
        expect(used <= (b.stockLength as number)).toBe(true);
      }
    }
  });

  it("every member appears exactly once in the cut list", () => {
    for (const wall of walls) {
      const { layout, cutList } = computeFraming(wall);
      const ids = cutList.flatMap((c) => c.memberIds).sort();
      const memberIds = layout.members.map((m) => m.id).sort();
      expect(ids).toEqual(memberIds);
    }
  });
});

// ---------------------------------------------------------------------------
// Feedback round 1: PT plates, cutouts, blocking, corners, opening names
// ---------------------------------------------------------------------------

describe("PT bottom plate + door cutout", () => {
  const out = get("door-8ft");

  it("marks the bottom plate treated and packs it on its own PT board", () => {
    const bottom = byRole(out.layout.members, "plate-bottom")[0]!;
    expect(bottom.treated).toBe(true);
    const ptBoards = out.packing.boards.filter((b) => b.treated);
    expect(ptBoards).toHaveLength(1);
    expect(ptBoards[0]!.cuts[0]!.memberId).toBe("PB");
    // PT board never shares cuts with untreated pieces
    for (const b of out.packing.boards.filter((x) => !x.treated)) {
      expect(b.cuts.some((c) => c.memberId === "PB")).toBe(false);
    }
    expect(out.shopping.some((l) => l.description.includes("pressure-treated"))).toBe(true);
  });

  it("cuts the bottom plate out of the door opening (render data)", () => {
    const bottom = byRole(out.layout.members, "plate-bottom")[0]!;
    expect(bottom.cutouts).toEqual([{ start: inches(30), end: inches(68) }]);
    // cut list still buys the full-length piece
    const line = out.cutList.find((c) => c.memberIds.includes("PB"))!;
    expect(line.length).toBe(inches(96));
  });

  it("labels opening pieces with display names", () => {
    expect(out.layout.roughOpenings[0]!.displayName).toBe("Door 1");
    const jackLine = out.cutList.find((c) => c.label.startsWith("Jack stud"))!;
    expect(jackLine.label).toContain("Door 1");
  });

  it("adds shims for the opening", () => {
    expect(out.shopping.some((l) => l.id === "shims")).toBe(true);
  });
});

describe("fire blocking", () => {
  const wall: WallInput = {
    ...FIXTURES["window-12ft"]!,
    fireBlocking: { enabled: true },
  };
  const out = computeFraming(wall);

  it("fills clear bays and never crosses openings or members", () => {
    const blocks = byRole(out.layout.members, "blocking");
    expect(blocks.length).toBeGreaterThan(2);
    // 16" OC clear bay is 14 1/2"
    expect(blocks.some((b) => (b.length as number) === (inches(14.5) as number))).toBe(true);
    const ro = out.layout.roughOpenings[0]!;
    for (const b of blocks) {
      const inRO =
        (b.x as number) < (ro.x as number) + (ro.width as number) &&
        (b.x as number) + (b.w as number) > (ro.x as number) &&
        (b.y as number) < (ro.y as number) + (ro.height as number) &&
        (b.y as number) + (b.h as number) > (ro.y as number);
      expect(inRO, `block ${b.id} crosses the RO`).toBe(false);
    }
  });

  it("appears in cut list, nailing, and tasks", () => {
    expect(out.cutList.some((c) => c.label === "Fire block")).toBe(true);
    expect(out.nailing.some((n) => n.joint.includes("Fire block"))).toBe(true);
    expect(out.tasks.some((t) => t.title === "Install fire blocking")).toBe(true);
  });
});

describe("corner studs", () => {
  const wall: WallInput = {
    ...FIXTURES["plain-8ft"]!,
    corners: { start: "california", end: "double" },
  };
  const out = computeFraming(wall);

  it("places corner studs per style", () => {
    const corners = byRole(out.layout.members, "stud-corner");
    expect(corners).toHaveLength(2);
    const left = corners.find((c) => c.id === "CS-L")!;
    const right = corners.find((c) => c.id === "CS-R")!;
    expect(left.x).toBe(inches(3.5)); // set back the intersecting wall depth
    expect(right.x).toBe(inches(96 - 3)); // double: tight to the end stud
    expect(out.nailing.some((n) => n.joint.includes("Corner"))).toBe(true);
  });
});
