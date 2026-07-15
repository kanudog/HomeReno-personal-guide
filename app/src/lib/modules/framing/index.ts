import { z } from "zod";
import { resolveRoughOpenings } from "./engine/roughOpening";
import { ENGINE_VERSION, layoutWall } from "./engine/layout";
import { generateCutList } from "./engine/cutList";
import { packCuts } from "./engine/binPacking";
import { generateNailingSchedule } from "./engine/nailing";
import { generateShoppingList } from "./engine/shopping";
import { generateTasks } from "./engine/tasks";
import type { FramingOutput, WallInput } from "./types";

const sixteenthsSchema = z.number().int().positive();

export const openingSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["door", "window"]),
  offset: z.number().int().nonnegative(),
  unitWidth: sixteenthsSchema,
  unitHeight: sixteenthsSchema,
  roOverride: z
    .object({ width: sixteenthsSchema, height: sixteenthsSchema })
    .optional(),
  sillHeight: sixteenthsSchema.optional(),
});

const cornerStyleSchema = z.enum(["none", "california", "double"]);

export const wallInputSchema = z.object({
  length: sixteenthsSchema,
  height: sixteenthsSchema,
  studSize: z.enum(["2x4", "2x6", "2x8", "2x10", "2x12"]),
  spacingOC: sixteenthsSchema,
  topPlate: z.enum(["single", "double"]),
  loadBearing: z.boolean(),
  // defaults keep rows saved by older engine versions parseable
  bottomPlatePT: z.boolean().default(true),
  fireBlocking: z
    .object({ enabled: z.boolean(), height: sixteenthsSchema.optional() })
    .optional(),
  corners: z.object({ start: cornerStyleSchema, end: cornerStyleSchema }).optional(),
  openings: z.array(openingSchema),
});

export { ENGINE_VERSION };

/** The full deterministic pipeline: WallInput → everything the UI renders. */
export function computeFraming(input: WallInput): FramingOutput {
  const resolved = resolveRoughOpenings(input.openings, input.loadBearing);
  const layout = layoutWall(input, resolved);
  const cutList = generateCutList(layout);
  const packing = packCuts(cutList);
  const nailing = generateNailingSchedule(layout);
  const shopping = generateShoppingList(packing, nailing, input.openings.length);
  const tasks = generateTasks(layout, cutList);
  return { layout, cutList, packing, nailing, shopping, tasks };
}

/** Parse unknown JSON (e.g. a designs.input row) into a WallInput. */
export function parseWallInput(data: unknown): WallInput {
  return wallInputSchema.parse(data) as WallInput;
}
