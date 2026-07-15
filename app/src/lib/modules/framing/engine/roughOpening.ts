import { addLen, sixteenths, type Sixteenths } from "@/lib/units";
import { DEFAULT_TOLERANCES, type ROTolerances } from "../data/tolerances";
import { sizeHeader } from "../data/headerTable";
import type { OpeningInput, ResolvedOpening } from "../types";

/**
 * Resolve each opening's rough opening from its unit dimensions and the
 * standard tolerances (or the user's direct override), then size its header.
 *
 * Door ROs start at the subfloor (y = 0); the bottom plate is cut out of
 * the opening after the wall is raised. Window ROs sit on the sill at
 * `sillHeight`.
 */
export function resolveRoughOpenings(
  openings: OpeningInput[],
  loadBearing: boolean,
  tolerances: ROTolerances = DEFAULT_TOLERANCES,
): ResolvedOpening[] {
  // number each kind left-to-right for stable display names
  const byX = [...openings].sort((a, b) => (a.offset as number) - (b.offset as number));
  const names = new Map<string, string>();
  let doors = 0;
  let windows = 0;
  for (const o of byX) {
    names.set(o.id, o.kind === "door" ? `Door ${++doors}` : `Window ${++windows}`);
  }

  return openings.map((o) => {
    const width = o.roOverride
      ? o.roOverride.width
      : addLen(
          o.unitWidth,
          o.kind === "window" ? tolerances.windowExtraWidth : tolerances.doorExtraWidth,
        );
    const height = o.roOverride
      ? o.roOverride.height
      : addLen(
          o.unitHeight,
          o.kind === "window" ? tolerances.windowExtraHeight : tolerances.doorExtraHeight,
        );

    const y = o.kind === "window" ? (o.sillHeight ?? sixteenths(36 * 16)) : sixteenths(0);

    // The clear span between jacks IS the RO width (header sizing input);
    // the header's cut length is RO width + 3" (it bears on both jacks).
    return {
      openingId: o.id,
      displayName: names.get(o.id)!,
      kind: o.kind,
      x: o.offset,
      y,
      width,
      height,
      headerSpec: sizeHeader(width, loadBearing),
    } satisfies ResolvedOpening;
  });
}
