import type { StudLayout } from "@/lib/modules/framing/types";

/**
 * Representative fastener positions derived from the nailing schedule
 * rules — enough to SHOW where nails go joint-by-joint (not a shop-exact
 * pattern). Inches, same coordinate space as `layoutToSolids`.
 */
export interface FastenerSolid {
  id: string;
  /** Cylinder center. */
  position: [number, number, number];
  /** Cylinder axis. */
  axis: "x" | "y" | "z";
  length: number;
  radius: number;
  joint: string;
}

const NAIL_16D = { length: 3.25, radius: 0.066 };
const NAIL_10D = { length: 2.9, radius: 0.058 };

export function generateFasteners(layout: StudLayout): FastenerSolid[] {
  const out: FastenerSolid[] = [];
  const toIn = (s: number) => s / 16;
  const plateT = 1.5;
  const H = toIn(layout.input.height as number);
  const topPlates = layout.input.topPlate === "double" ? 2 : 1;
  const topAssemblyBottom = H - topPlates * plateT;
  let n = 0;
  const add = (
    joint: string,
    position: [number, number, number],
    axis: FastenerSolid["axis"],
    spec = NAIL_16D,
  ) => {
    out.push({ id: `N${++n}`, position, axis, length: spec.length, radius: spec.radius, joint });
  };

  const verticals = layout.members.filter((m) => m.orientation === "vertical");

  for (const m of verticals) {
    const x = toIn(m.x as number);
    const w = toIn(m.w as number);
    const yBot = toIn(m.y as number);
    const yTop = yBot + toIn(m.h as number);
    // end-nailed through the plate below into the stud end (2 per end)
    if (Math.abs(yBot - plateT) < 0.01) {
      add("Stud to bottom plate — 2× 16d end nails", [x + w * 0.3, yBot - plateT / 2 + 0.4, 0.8], "y");
      add("Stud to bottom plate — 2× 16d end nails", [x + w * 0.7, yBot - plateT / 2 + 0.4, -0.8], "y");
    }
    // and through the top plate into the stud top
    if (Math.abs(yTop - topAssemblyBottom) < 0.01) {
      add("Stud to top plate — 2× 16d end nails", [x + w * 0.3, yTop + plateT / 2 - 0.4, 0.8], "y");
      add("Stud to top plate — 2× 16d end nails", [x + w * 0.7, yTop + plateT / 2 - 0.4, -0.8], "y");
    }
  }

  // jack → king: 10d face nails @ 24" staggered, through the jack into the king
  for (const jack of verticals.filter((m) => m.role === "stud-jack")) {
    const king = verticals.find(
      (k) =>
        k.role === "stud-king" &&
        k.openingId === jack.openingId &&
        Math.abs((k.x as number) - (jack.x as number)) === 24,
    );
    if (!king) continue;
    const boundary = toIn(Math.max(jack.x as number, king.x as number));
    const h = toIn(jack.h as number);
    for (let y = 12; y < h; y += 24) {
      add(
        'Jack to king — 10d @ 24" staggered',
        [boundary, toIn(jack.y as number) + y, y % 48 < 24 ? 0.9 : -0.9],
        "x",
        NAIL_10D,
      );
    }
  }

  // header ends: 4× 16d through the king into each header end
  for (const hdr of layout.members.filter((m) => m.role === "header-ply")) {
    const y0 = toIn(hdr.y as number);
    const d = toIn(hdr.h as number);
    for (const endX of [toIn(hdr.x as number) - 0.02, toIn(hdr.x as number) + toIn(hdr.w as number) + 0.02]) {
      add("Header to king — 4× 16d end nails", [endX, y0 + d * 0.3, 0.7], "x");
      add("Header to king — 4× 16d end nails", [endX, y0 + d * 0.7, -0.7], "x");
    }
  }

  // sill ends: 2× 16d through the jack into the sill
  for (const sill of layout.members.filter((m) => m.role === "sill")) {
    const y = toIn(sill.y as number) + 0.75;
    add("Sill to jack — 2× 16d end nails", [toIn(sill.x as number) - 0.02, y, 0.8], "x");
    add("Sill to jack — 2× 16d end nails", [toIn(sill.x as number) + toIn(sill.w as number) + 0.02, y, -0.8], "x");
  }

  // blocking: 2× 16d end nails per block end
  for (const b of layout.members.filter((m) => m.role === "blocking")) {
    const yMid = toIn(b.y as number) + 0.75;
    add("Fire block — 2× 16d per end", [toIn(b.x as number) - 0.02, yMid, 0.8], "x");
    add("Fire block — 2× 16d per end", [toIn(b.x as number) + toIn(b.w as number) + 0.02, yMid, -0.8], "x");
  }

  // cap plate → top plate: 10d @ 24" staggered
  const cap = layout.members.find((m) => m.role === "plate-cap");
  if (cap) {
    const L = toIn(cap.w as number);
    for (let x = 12; x < L; x += 24) {
      add('Cap to top plate — 10d @ 24"', [toIn(cap.x as number) + x, topAssemblyBottom + plateT, (x % 48 < 24 ? 1 : -1) * 0.8], "y", NAIL_10D);
    }
  }

  return out;
}
