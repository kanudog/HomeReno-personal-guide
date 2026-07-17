import { z } from "zod";
import type {
  DevicePlan,
  ElectricalInput,
  ElectricalOutput,
  ElectricalWarning,
  PanelDirectoryEntry,
} from "./types";
import { deviceSpec } from "./data/devices";
import { buildDevicePlan } from "./engine/connections";
import { computeCircuitLoads } from "./engine/circuitLoad";
import { runAdvisor } from "./engine/advisor";
import { validateDesign } from "./engine/validate";
import { buildSchematic } from "./engine/schematic";
import { generateShopping } from "./engine/shopping";
import { generateElectricalTasks } from "./engine/tasks";

export const ENGINE_VERSION = "electrical-0.1.0";

const sixteenthsSchema = z.number().int().positive();

export const applianceLoadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  va: z.number().int().positive(),
  qty: z.number().int().positive().default(1),
  continuous: z.boolean().default(false),
});

export const roomFactsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    "laundry",
    "kitchen",
    "bathroom",
    "garage",
    "bedroom",
    "living",
    "basement-finished",
    "basement-unfinished",
    "outdoor",
    "other",
  ]),
  wallLengths: z.array(sixteenthsSchema).default([]),
  counterRunLengths: z.array(sixteenthsSchema).optional(),
});

const deviceKindSchema = z.enum([
  "receptacle-duplex",
  "receptacle-gfci",
  "receptacle-switched",
  "switch-single-pole",
  "switch-3way",
  "switch-4way",
  "dimmer-single-pole",
  "dimmer-3way",
  "smart-switch",
  "ceiling-light",
  "ceiling-fan",
  "receptacle-240",
]);

export const deviceInputSchema = z.object({
  id: z.string().min(1),
  kind: deviceKindSchema,
  config: z.string().min(1),
  position: z.enum(["end-of-run", "middle-of-run"]).default("end-of-run"),
  workType: z.enum(["new-work", "old-work", "existing-box"]).default("new-work"),
  boxId: z.string().optional(),
  roomId: z.string().optional(),
  location: z.enum(["wall", "counter"]).optional(),
  feedLengthFt: z.number().int().positive().optional(),
  wallDesignId: z.string().optional(),
  xOnWall: sixteenthsSchema.optional(),
  heightAFF: sixteenthsSchema.optional(),
});

const cableTypeSchema = z.enum(["14/2", "14/3", "12/2", "12/3", "10/2", "10/3", "8/3", "6/3"]);

export const circuitInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  existing: z.boolean().default(false),
  breakerAmps: z.number().int().positive(),
  poles: z.union([z.literal(1), z.literal(2)]).default(1),
  breakerType: z.enum(["standard", "gfci", "afci", "dual-function"]).default("standard"),
  cable: cableTypeSchema,
  slot: z.number().int().positive().optional(),
  roomId: z.string().optional(),
  devices: z.array(deviceInputSchema).default([]),
  loads: z.array(applianceLoadSchema).default([]),
});

export const panelInputSchema = z.object({
  label: z.string().default("Main panel"),
  mainAmps: z.number().int().positive().default(200),
  slots: z.number().int().positive().default(40),
  existing: z
    .array(
      z.object({
        slot: z.number().int().positive(),
        label: z.string(),
        amps: z.number().int().positive(),
        poles: z.union([z.literal(1), z.literal(2)]).default(1),
      }),
    )
    .default([]),
});

export const advisorInputSchema = z.object({
  loads: z.array(applianceLoadSchema),
  breakerAmpsOptions: z.array(z.number().int().positive()).optional(),
  maxCircuits: z.number().int().positive().optional(),
  volts: z.number().int().positive().optional(),
});

/** Defaults keep rows saved by older engine versions parseable. */
export const electricalInputSchema = z.object({
  system: z.literal("mains").default("mains"),
  // zod v4 returns .default() values as-is (no inner parse) — spell it out
  panel: panelInputSchema.default({ label: "Main panel", mainAmps: 200, slots: 40, existing: [] }),
  circuits: z.array(circuitInputSchema).default([]),
  rooms: z.array(roomFactsSchema).default([]),
  advisor: advisorInputSchema.optional(),
});

/** Parse unknown JSON (e.g. a designs.input row) into an ElectricalInput. */
export function parseElectricalInput(data: unknown): ElectricalInput {
  return electricalInputSchema.parse(data) as ElectricalInput;
}

/** Numbered display names per device family: "Receptacle 1", "GFCI 2"… */
function assignDisplayNames(input: ElectricalInput): Map<string, string> {
  const counters = new Map<string, number>();
  const names = new Map<string, string>();
  for (const circuit of input.circuits) {
    for (const device of circuit.devices) {
      const base = deviceSpec(device.kind)?.displayBase ?? device.kind;
      const n = (counters.get(base) ?? 0) + 1;
      counters.set(base, n);
      names.set(device.id, `${base} ${n}`);
    }
  }
  return names;
}

/** The full deterministic pipeline: ElectricalInput → everything the UI renders. */
export function computeElectrical(input: ElectricalInput): ElectricalOutput {
  const warnings: ElectricalWarning[] = [];
  const displayNames = assignDisplayNames(input);

  const devicePlans: DevicePlan[] = [];
  const plansByDevice = new Map<string, DevicePlan>();
  for (const circuit of input.circuits) {
    for (const device of circuit.devices) {
      const { plan, warnings: planWarnings } = buildDevicePlan(
        circuit,
        device,
        displayNames.get(device.id) ?? device.id,
      );
      warnings.push(...planWarnings);
      if (plan) {
        devicePlans.push(plan);
        plansByDevice.set(device.id, plan);
      }
    }
  }

  const circuitLoads = computeCircuitLoads(input.circuits);
  const advisor =
    input.advisor && input.advisor.loads.length > 0 ? runAdvisor(input.advisor) : undefined;

  warnings.push(...validateDesign(input, circuitLoads));

  const panelDirectory: PanelDirectoryEntry[] = [
    ...(input.panel.existing ?? []).map((e) => ({
      slot: e.slot,
      label: e.label,
      amps: e.amps,
      poles: e.poles,
      isNew: false,
    })),
    ...input.circuits
      .filter((c) => c.slot !== undefined)
      .map((c) => ({
        slot: c.slot!,
        label: c.name,
        amps: c.breakerAmps,
        poles: c.poles,
        isNew: !c.existing,
      })),
  ].sort((a, b) => a.slot - b.slot);

  const schematic = buildSchematic(input, plansByDevice);
  const shopping = generateShopping(input, devicePlans);
  const tasks = generateElectricalTasks(input, devicePlans);

  return {
    engineVersion: ENGINE_VERSION,
    input,
    devicePlans,
    circuitLoads,
    advisor,
    panelDirectory,
    schematic,
    warnings,
    shopping,
    tasks,
  };
}
