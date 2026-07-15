import { formatLength, type Sixteenths } from "@/lib/units";
import { LUMBER_DIMS, PLATE_THICKNESS, STUD_FACE, STOCK_LENGTHS } from "../data/lumber";
import type {
  DimensionAnnotation,
  EngineWarning,
  FramingMember,
  ResolvedOpening,
  StudLayout,
  WallInput,
} from "../types";

export const ENGINE_VERSION = "framing-1.0.0";

const S = (n: number) => n as Sixteenths;
const HALF_FACE = 12 as Sixteenths; // 3/4"

interface Interval {
  start: number;
  end: number;
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && a.end > b.start;

/**
 * Deterministically solve the full stud layout for a wall.
 * Pure function: (input, resolved openings) → members + dims + warnings.
 */
export function layoutWall(input: WallInput, openings: ResolvedOpening[]): StudLayout {
  const warnings: EngineWarning[] = [];
  const members: FramingMember[] = [];

  const length = input.length as number;
  const height = input.height as number;
  const oc = input.spacingOC as number;
  const plateT = PLATE_THICKNESS as number; // 24 (1.5")
  const face = STUD_FACE as number; // 24 (1.5")
  const topPlateCount = input.topPlate === "double" ? 2 : 1;
  const topAssemblyBottom = height - topPlateCount * plateT;
  const studLen = topAssemblyBottom - plateT;

  if (length <= face * 2 || studLen <= 0) {
    throw new Error("Wall is too small to frame");
  }

  const sorted = [...openings].sort((a, b) => (a.x as number) - (b.x as number));

  // ---- validation warnings -------------------------------------------------
  for (const ro of sorted) {
    const x = ro.x as number;
    const w = ro.width as number;
    if (x < 0 || x + w > length) {
      warnings.push({
        code: "opening-out-of-bounds",
        message: `${ro.displayName} extends past the wall`,
        openingId: ro.openingId,
      });
    } else if (x - 2 * face < 0 || x + w + 2 * face > length) {
      warnings.push({
        code: "opening-near-wall-end",
        message: `${ro.displayName} is too close to the wall end for full king + jack framing`,
        openingId: ro.openingId,
      });
    }
    if (ro.headerSpec.engineered) {
      warnings.push({
        code: "header-span-exceeds-table",
        message: `${ro.displayName} span exceeds the rule-of-thumb header table — use an engineered header (LVL) and verify with span tables`,
        openingId: ro.openingId,
      });
    }
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const zoneA = { start: (a.x as number) - 2 * face, end: (a.x as number) + (a.width as number) + 2 * face };
    const zoneB = { start: (b.x as number) - 2 * face, end: (b.x as number) + (b.width as number) + 2 * face };
    if (overlaps(zoneA, zoneB)) {
      warnings.push({
        code: "openings-overlap",
        message: `Openings ${a.openingId} and ${b.openingId} overlap (including their king/jack zones)`,
        openingId: b.openingId,
      });
    }
  }

  // ---- plates ---------------------------------------------------------------
  const maxStock = STOCK_LENGTHS[STOCK_LENGTHS.length - 1] as number;
  const gridCenters: number[] = [];
  for (let c = oc; c + HALF_FACE < length - face; c += oc) gridCenters.push(c);

  const splitPlate = (offsetFirstJoint: number): Interval[] => {
    if (length <= maxStock) return [{ start: 0, end: length }];
    const pieces: Interval[] = [];
    let start = 0;
    let first = true;
    while (length - start > maxStock) {
      const limit = start + maxStock - (first ? offsetFirstJoint : 0);
      // splice must land on a stud center so both plate ends bear on wood
      const candidates = gridCenters.filter((c) => c > start + face && c <= limit);
      const joint = candidates.length > 0 ? candidates[candidates.length - 1]! : limit;
      pieces.push({ start, end: joint });
      start = joint;
      first = false;
    }
    pieces.push({ start, end: length });
    return pieces;
  };

  const emitPlates = (
    role: "plate-bottom" | "plate-top" | "plate-cap",
    y: number,
    idPrefix: string,
    label: string,
    offsetFirstJoint = 0,
  ) => {
    const pieces = splitPlate(offsetFirstJoint);
    if (pieces.length > 1) {
      warnings.push({
        code: "plate-spliced",
        message: `${label} is spliced (${pieces.length} pieces) — joints land on stud centers`,
      });
    }
    pieces.forEach((p, i) => {
      members.push({
        id: pieces.length > 1 ? `${idPrefix}${i + 1}` : idPrefix,
        role,
        size: input.studSize,
        x: S(p.start),
        y: S(y),
        w: S(p.end - p.start),
        h: S(plateT),
        length: S(p.end - p.start),
        orientation: "horizontal",
        label:
          (pieces.length > 1 ? `${label} (piece ${i + 1})` : label) +
          (role === "plate-bottom" && input.bottomPlatePT ? " — PT" : ""),
        treated: role === "plate-bottom" ? input.bottomPlatePT : undefined,
      });
    });
  };

  emitPlates("plate-bottom", 0, "PB", "Bottom plate");
  emitPlates("plate-top", topAssemblyBottom, "PT", "Top plate");
  if (topPlateCount === 2) {
    // pull the first cap-plate joint back 48" so splices offset from the top plate's
    emitPlates("plate-cap", topAssemblyBottom + plateT, "PC", "Cap plate", 768);
  }

  // ---- opening members ------------------------------------------------------
  const verticalZones: Interval[] = []; // occupied x-spans of opening framing

  sorted.forEach((ro, idx) => {
    const n = idx + 1;
    const x = ro.x as number;
    const w = ro.width as number;
    const roTop = (ro.y as number) + (ro.height as number);
    const headerDepth = ro.headerSpec.depth as number;

    const addVertical = (
      id: string,
      role: FramingMember["role"],
      vx: number,
      vy: number,
      len: number,
      label: string,
    ) => {
      if (vx < 0 || vx + face > length || len <= 0) return; // clipped — warned above
      members.push({
        id,
        role,
        size: input.studSize,
        x: S(vx),
        y: S(vy),
        w: S(face),
        h: S(len),
        length: S(len),
        orientation: "vertical",
        openingId: ro.openingId,
        label,
      });
      verticalZones.push({ start: vx, end: vx + face });
    };

    // Kings: full height, plate to plate
    addVertical(`K${n}-L`, "stud-king", x - 2 * face, plateT, studLen, `King stud (L, ${ro.displayName})`);
    addVertical(`K${n}-R`, "stud-king", x + w + face, plateT, studLen, `King stud (R, ${ro.displayName})`);

    // Jacks: bottom plate to header bottom
    const jackLen = roTop - plateT;
    addVertical(`J${n}-L`, "stud-jack", x - face, plateT, jackLen, `Jack stud (L, ${ro.displayName})`);
    addVertical(`J${n}-R`, "stud-jack", x + w, plateT, jackLen, `Jack stud (R, ${ro.displayName})`);

    // Header: bears on both jacks
    const headerLen = w + 2 * face;
    const headerFits = roTop + headerDepth <= topAssemblyBottom;
    if (!headerFits) {
      warnings.push({
        code: "header-does-not-fit",
        message: `${ro.displayName}: header (${formatLength(ro.headerSpec.depth)} deep) does not fit between the RO top and the top plate`,
        openingId: ro.openingId,
      });
    } else {
      const plyIds = ["A", "B", "C"];
      for (let p = 0; p < ro.headerSpec.plies; p++) {
        members.push({
          id: `HDR${n}-${plyIds[p] ?? p + 1}`,
          role: "header-ply",
          size: ro.headerSpec.size,
          x: S(x - face),
          y: S(roTop),
          w: S(headerLen),
          h: S(headerDepth),
          length: S(headerLen),
          orientation: ro.headerSpec.orientation,
          openingId: ro.openingId,
          label:
            ro.headerSpec.plies > 1
              ? `Header ply ${plyIds[p] ?? p + 1} (${ro.displayName})`
              : `Header — flat (${ro.displayName})`,
        });
      }
    }

    // Cripples above the header, continuing the OC grid
    if (headerFits) {
      const gapAbove = topAssemblyBottom - (roTop + headerDepth);
      if (gapAbove > 0 && gapAbove < face) {
        warnings.push({
          code: "cripple-sliver",
          message: `${ro.displayName}: only ${formatLength(S(gapAbove))} above the header — use flat blocking instead of cripples`,
          openingId: ro.openingId,
        });
      } else if (gapAbove >= face) {
        const cy = roTop + headerDepth;
        const inRo = gridCenters.filter((c) => c - HALF_FACE >= x && c + HALF_FACE <= x + w);
        const centers = inRo.length > 0 ? inRo : w >= oc ? [x + w / 2] : [];
        centers.forEach((c, ci) => {
          members.push({
            id: `CA${n}-${ci + 1}`,
            role: "cripple-above",
            size: input.studSize,
            x: S(Math.round(c - HALF_FACE)),
            y: S(cy),
            w: S(face),
            h: S(gapAbove),
            length: S(gapAbove),
            orientation: "vertical",
            openingId: ro.openingId,
            label: `Cripple above header (${ro.displayName})`,
          });
        });
      }
    }

    // Window sill + cripples below
    if (ro.kind === "window") {
      const sillBottom = (ro.y as number) - plateT;
      if (sillBottom < plateT) {
        warnings.push({
          code: "sill-below-plate",
          message: `${ro.displayName}: sill height leaves no room for the sill and cripples above the bottom plate`,
          openingId: ro.openingId,
        });
      } else {
        members.push({
          id: `SL${n}`,
          role: "sill",
          size: input.studSize,
          x: S(x),
          y: S(sillBottom),
          w: S(w),
          h: S(plateT),
          length: S(w),
          orientation: "flat",
          openingId: ro.openingId,
          label: `Window sill (${ro.displayName})`,
        });

        const cripLen = sillBottom - plateT;
        if (cripLen > 0 && cripLen < face) {
          warnings.push({
            code: "cripple-sliver",
            message: `${ro.displayName}: only ${formatLength(S(cripLen))} below the sill — use flat blocking`,
            openingId: ro.openingId,
          });
        } else if (cripLen >= face) {
          // Edge cripples carry the sill ends; grid cripples continue the layout
          const positions: number[] = [x, x + w - face];
          for (const c of gridCenters) {
            const px = c - HALF_FACE;
            if (px >= x + face && px + face <= x + w - face) positions.push(px);
          }
          positions
            .sort((a, b) => a - b)
            .forEach((px, ci) => {
              members.push({
                id: `CB${n}-${ci + 1}`,
                role: "cripple-below",
                size: input.studSize,
                x: S(Math.round(px)),
                y: S(plateT),
                w: S(face),
                h: S(cripLen),
                length: S(cripLen),
                orientation: "vertical",
                openingId: ro.openingId,
                label: `Cripple below sill (${ro.displayName})`,
              });
            });
        }
      }
    }
  });

  // ---- corner studs -----------------------------------------------------------
  // California corner: end stud + a second stud set back the intersecting
  // wall's depth, leaving interior drywall backing. Double: two studs tight.
  const wallDepth = LUMBER_DIMS[input.studSize].width as number; // 3.5" for 2x4
  const cornerAt = (end: "start" | "end", style: "california" | "double") => {
    const cx =
      end === "start"
        ? style === "california"
          ? wallDepth
          : face
        : style === "california"
          ? length - wallDepth - face
          : length - 2 * face;
    if (cx < 0 || cx + face > length) return;
    members.push({
      id: end === "start" ? "CS-L" : "CS-R",
      role: "stud-corner",
      size: input.studSize,
      x: S(Math.round(cx)),
      y: S(plateT),
      w: S(face),
      h: S(studLen),
      length: S(studLen),
      orientation: "vertical",
      label: `Corner stud (${style === "california" ? "California" : "double"}, ${end === "start" ? "left" : "right"} end)`,
    });
    verticalZones.push({ start: cx, end: cx + face });
  };
  if (input.corners?.start && input.corners.start !== "none") cornerAt("start", input.corners.start);
  if (input.corners?.end && input.corners.end !== "none") cornerAt("end", input.corners.end);

  // ---- common studs ----------------------------------------------------------
  const roZones: Interval[] = sorted.map((ro) => ({
    start: (ro.x as number) - 2 * face,
    end: (ro.x as number) + (ro.width as number) + 2 * face,
  }));

  const placed: Interval[] = [];
  const blocked = (start: number, end: number) =>
    start < 0 ||
    end > length ||
    roZones.some((z) => overlaps({ start, end }, z)) ||
    verticalZones.some((z) => overlaps({ start, end }, z)) ||
    placed.some((z) => overlaps({ start, end }, z));

  const commonXs: number[] = [];
  const tryPlace = (sx: number): boolean => {
    if (blocked(sx, sx + face)) return false;
    placed.push({ start: sx, end: sx + face });
    commonXs.push(sx);
    return true;
  };

  tryPlace(0);
  tryPlace(length - face);
  for (const c of gridCenters) {
    if (tryPlace(c - HALF_FACE)) continue;
    // Grid line already backed by opening framing or falls inside the RO?
    const inRO = sorted.some(
      (ro) => (ro.x as number) <= c && c <= (ro.x as number) + (ro.width as number),
    );
    const onMember = verticalZones.some((z) => z.start <= c && c <= z.end);
    if (inRO || onMember) continue;
    // Slide the stud to butt the blocking framing while still backing the
    // grid line (what a framer does when a layout stud lands on a king).
    const zones = [...roZones, ...verticalZones, ...placed];
    const slid = zones
      .flatMap((z) => [z.end, z.start - face])
      .filter((sx) => sx <= c && c <= sx + face)
      .sort((a, b) => Math.abs(a + HALF_FACE - c) - Math.abs(b + HALF_FACE - c))
      .find((sx) => !blocked(sx, sx + face));
    if (slid !== undefined) tryPlace(slid);
  }

  commonXs
    .sort((a, b) => a - b)
    .forEach((sx, i) => {
      members.push({
        id: `S${i + 1}`,
        role: "stud-common",
        size: input.studSize,
        x: S(Math.round(sx)),
        y: S(plateT),
        w: S(face),
        h: S(studLen),
        length: S(studLen),
        orientation: "vertical",
        label: "Common stud",
      });
    });

  // ---- bottom plate cutouts at door openings -----------------------------------
  for (const ro of sorted) {
    if (ro.kind !== "door") continue;
    const x = ro.x as number;
    const w = ro.width as number;
    for (const m of members) {
      if (m.role !== "plate-bottom") continue;
      const mStart = m.x as number;
      const mEnd = mStart + (m.w as number);
      const cutStart = Math.max(mStart, x);
      const cutEnd = Math.min(mEnd, x + w);
      if (cutEnd > cutStart) {
        m.cutouts = [...(m.cutouts ?? []), { start: S(cutStart), end: S(cutEnd) }];
      }
    }
  }

  // ---- fire blocking ------------------------------------------------------------
  if (input.fireBlocking?.enabled) {
    const rowCenter = (input.fireBlocking.height as number | undefined) ?? Math.round(height / 2);
    const baseY = Math.min(
      Math.max(rowCenter - HALF_FACE, plateT + face),
      topAssemblyBottom - 2 * face,
    );
    const roRects = sorted.map((ro) => ({
      x1: ro.x as number,
      x2: (ro.x as number) + (ro.width as number),
      y1: ro.y as number,
      y2: (ro.y as number) + (ro.height as number),
    }));
    let bays = 0;
    // alternate bays offset a full block height so each block can be end-nailed
    for (const stagger of [0, face]) {
      const y = baseY + stagger;
      const atRow = members
        .filter(
          (m) =>
            m.orientation === "vertical" &&
            (m.y as number) < y + face &&
            (m.y as number) + (m.h as number) > y,
        )
        .sort((a, b) => (a.x as number) - (b.x as number));
      for (let i = 0; i < atRow.length - 1; i++) {
        if ((i + (stagger === 0 ? 0 : 1)) % 2 !== 0) continue; // alternate bays per row
        const a = atRow[i]!;
        const b = atRow[i + 1]!;
        const gapStart = (a.x as number) + (a.w as number);
        const gapEnd = b.x as number;
        const gap = gapEnd - gapStart;
        if (gap <= 0) continue;
        // skip bays that pass through a rough opening or any horizontal member
        const hitsRO = roRects.some(
          (r) => gapStart < r.x2 && gapEnd > r.x1 && y < r.y2 && y + face > r.y1,
        );
        const hitsMember = members.some(
          (m) =>
            m.orientation !== "vertical" &&
            gapStart < (m.x as number) + (m.w as number) &&
            gapEnd > (m.x as number) &&
            y < (m.y as number) + (m.h as number) &&
            y + face > (m.y as number),
        );
        if (hitsRO || hitsMember) continue;
        bays += 1;
        members.push({
          id: `FB${bays}`,
          role: "blocking",
          size: input.studSize,
          x: S(gapStart),
          y: S(y),
          w: S(gap),
          h: S(face),
          length: S(gap),
          orientation: "horizontal",
          label: "Fire block",
        });
      }
    }
  }

  // ---- dimension annotations ---------------------------------------------------
  const dimensions: DimensionAnnotation[] = [];

  dimensions.push({ axis: "x", from: S(0), to: S(length), lane: 2, kind: "overall" });

  if (sorted.length > 0) {
    // chained: wall end → RO edges → wall end
    let cursor = 0;
    for (const ro of sorted) {
      const x = ro.x as number;
      const w = ro.width as number;
      if (x > cursor) {
        dimensions.push({ axis: "x", from: S(cursor), to: S(x), lane: 1, kind: "opening" });
      }
      dimensions.push({
        axis: "x",
        from: S(x),
        to: S(x + w),
        lane: 1,
        kind: "opening",
        labelPrefix: "RO ",
      });
      cursor = x + w;
    }
    if (cursor < length) {
      dimensions.push({ axis: "x", from: S(cursor), to: S(length), lane: 1, kind: "opening" });
    }
  }

  // one OC callout between the first pair of adjacent grid studs
  const gridStuds = members
    .filter((m) => m.role === "stud-common" && (m.x as number) > 0 && (m.x as number) < length - face)
    .map((m) => (m.x as number) + HALF_FACE)
    .sort((a, b) => a - b);
  for (let i = 0; i < gridStuds.length - 1; i++) {
    if (gridStuds[i + 1]! - gridStuds[i]! === oc) {
      dimensions.push({
        axis: "x",
        from: S(gridStuds[i]!),
        to: S(gridStuds[i + 1]!),
        lane: 0,
        kind: "spacing",
        labelSuffix: " OC TYP",
      });
      break;
    }
  }

  // vertical dims: dedupe identical heights, stack distinct ones on separate lanes
  const yDims = new Map<string, { to: number; kind: "header" | "sill"; prefix: string }>();
  for (const ro of sorted) {
    const roTop = (ro.y as number) + (ro.height as number);
    yDims.set(`header-${roTop}`, { to: roTop, kind: "header", prefix: "RO top " });
    if (ro.kind === "window") {
      yDims.set(`sill-${ro.y as number}`, { to: ro.y as number, kind: "sill", prefix: "Sill " });
    }
  }
  const yStack = [...yDims.values()].sort((a, b) => a.to - b.to);
  yStack.forEach((d, i) => {
    dimensions.push({
      axis: "y",
      from: S(0),
      to: S(d.to),
      lane: i,
      kind: d.kind,
      labelPrefix: d.prefix,
    });
  });
  dimensions.push({ axis: "y", from: S(0), to: S(height), lane: yStack.length, kind: "height" });

  // stable order: plates, then left-to-right verticals, headers, sills
  const roleOrder: Record<string, number> = {
    "plate-bottom": 0,
    "plate-top": 1,
    "plate-cap": 2,
    "stud-common": 3,
    "stud-corner": 3,
    "stud-king": 3,
    "stud-jack": 3,
    "cripple-above": 3,
    "cripple-below": 3,
    sill: 4,
    blocking: 4,
    "header-ply": 5,
  };
  members.sort(
    (a, b) =>
      (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) ||
      (a.x as number) - (b.x as number) ||
      (a.y as number) - (b.y as number) ||
      a.id.localeCompare(b.id),
  );

  return {
    input,
    engineVersion: ENGINE_VERSION,
    members,
    roughOpenings: sorted,
    dimensions,
    warnings,
  };
}

/** All grid line centers for a wall — used by snapping and invariant tests. */
export function ocGridCenters(input: WallInput): number[] {
  const centers: number[] = [];
  const oc = input.spacingOC as number;
  for (let c = oc; c + HALF_FACE < (input.length as number) - (STUD_FACE as number); c += oc) {
    centers.push(c);
  }
  return centers;
}
