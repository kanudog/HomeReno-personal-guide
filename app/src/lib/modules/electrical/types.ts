import type { Sixteenths } from "@/lib/units";

/**
 * Electrical quantities are exact integers, mirroring the Sixteenths rule:
 * volts, amps, and volt-amps are plain integers; box volume is an integer
 * count of QUARTER cubic inches (NEC 314.16 allowances are 0.25 in³ granular).
 * Money is cents. Lengths stay Sixteenths.
 */
export type QuarterIn3 = number & { readonly __brand: "quarterIn3" };

/** Low-voltage electronics (smart-home builds) arrive in a later phase. */
export type SystemKind = "mains";

export type Awg = 14 | 12 | 10 | 8 | 6;

/** NM-B cable: gauge / insulated conductor count (ground always present). */
export type CableType =
  | "14/2"
  | "14/3"
  | "12/2"
  | "12/3"
  | "10/2"
  | "10/3"
  | "8/2"
  | "8/3"
  | "6/2"
  | "6/3";

export type ConductorColor = "black" | "red" | "white" | "bare" | "green";

export type ConductorRole =
  | "hot"
  | "switched"
  | "traveler"
  | "neutral"
  | "ground"
  | "spare";

export type DeviceKind =
  // wave 1
  | "receptacle-duplex"
  | "receptacle-gfci"
  | "receptacle-switched"
  | "switch-single-pole"
  | "switch-3way"
  // wave 2 (types reserved; catalog entries land with that wave)
  | "switch-4way"
  | "dimmer-single-pole"
  | "dimmer-3way"
  | "smart-switch"
  | "ceiling-light"
  | "ceiling-fan"
  | "receptacle-240";

export type DevicePosition = "end-of-run" | "middle-of-run";

/** New run on open framing / cut into finished drywall / box already there. */
export type WorkType = "new-work" | "old-work" | "existing-box";

export type RoomType =
  | "laundry"
  | "kitchen"
  | "bathroom"
  | "garage"
  | "bedroom"
  | "living"
  | "basement-finished"
  | "basement-unfinished"
  | "outdoor"
  | "other";

/**
 * Lightweight room facts — enough for the geometry-based code checks
 * (receptacle spacing, counter rules, GFCI zones) without the room planner.
 * A later phase auto-fills these from planned rooms.
 */
export interface RoomFacts {
  id: string;
  name: string;
  type: RoomType;
  /** Usable wall segments along the floor line (openings excluded). */
  wallLengths: Sixteenths[];
  /** Kitchen counter segments (each run needing counter receptacles). */
  counterRunLengths?: Sixteenths[];
}

export interface ApplianceLoad {
  id: string;
  name: string;
  /** Nameplate volt-amps per unit. */
  va: number;
  qty: number;
  /** Runs 3+ hours (3D printers, lighting) — factored at 125%. */
  continuous: boolean;
}

export type BreakerType = "standard" | "gfci" | "afci" | "dual-function";

export interface PanelInput {
  label: string;
  mainAmps: number;
  /** Total breaker spaces. Odd slots left column, even right; a 2-pole takes slot and slot+2. */
  slots: number;
  /** What's already in the panel (kept in the printed directory). */
  existing?: { slot: number; label: string; amps: number; poles: 1 | 2 }[];
}

export interface DeviceInput {
  id: string;
  kind: DeviceKind;
  /** Configuration id from the device catalog (e.g. "line-load", "power-in-first"). */
  config: string;
  position: DevicePosition;
  workType: WorkType;
  /** Box from the catalog; omitted → engine picks the smallest that passes fill. */
  boxId?: string;
  roomId?: string;
  /** Wall receptacle vs kitchen-counter receptacle (drives 210.52 checks). */
  location?: "wall" | "counter";
  /** Estimated length of the cable segment FEEDING this device, in feet. */
  feedLengthFt?: number;
  /** What you found in the field (troubleshoot wizard writes here). */
  fieldNotes?: string;
  // Reserved for the framing/room-planner integration phase:
  wallDesignId?: string;
  xOnWall?: Sixteenths;
  heightAFF?: Sixteenths;
}

export interface CircuitInput {
  id: string;
  name: string;
  /** Already in the panel — no breaker/home-run purchase, directory shows it as existing. */
  existing: boolean;
  breakerAmps: number;
  poles: 1 | 2;
  breakerType: BreakerType;
  cable: CableType;
  /** Panel slot for the breaker (1-based). */
  slot?: number;
  roomId?: string;
  devices: DeviceInput[];
  /** Fixed/plug-in loads served by this circuit (for the load check). */
  loads: ApplianceLoad[];
}

/** Standalone capacity study: "one breaker or two?" for a set of loads. */
export interface AdvisorInput {
  loads: ApplianceLoad[];
  /** Breaker sizes to consider (default [15, 20]). */
  breakerAmpsOptions?: number[];
  /** Consider splitting across up to this many circuits (default 2). */
  maxCircuits?: number;
  volts?: number;
}

export interface ElectricalInput {
  system: SystemKind;
  panel: PanelInput;
  circuits: CircuitInput[];
  rooms: RoomFacts[];
  advisor?: AdvisorInput;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type ElectricalWarningCode =
  | "gauge-breaker-mismatch"
  | "box-fill-exceeded"
  | "gfci-required"
  | "afci-required"
  | "tamper-resistant-required"
  | "dedicated-circuit-required"
  | "receptacle-spacing"
  | "counter-receptacle-spacing"
  | "room-receptacle-required"
  | "load-exceeds-capacity"
  | "invalid-device-config"
  | "config-not-for-new-work"
  | "three-way-unpaired"
  | "panel-slot-conflict"
  | "panel-slots-exceeded"
  | "wirenut-overfilled";

export type WarningSeverity = "info" | "warn" | "danger";

export interface ElectricalWarning {
  code: ElectricalWarningCode;
  severity: WarningSeverity;
  message: string;
  circuitId?: string;
  deviceId?: string;
  roomId?: string;
}

/** One physical insulated-or-bare wire arriving in a box via a cable. */
export interface ResolvedConductor {
  /** Stable id: "<deviceId>.<cableRole>.<color>". */
  id: string;
  cableRole: string;
  color: ConductorColor;
  /** Re-taped color (e.g. white re-identified as hot in a legacy loop). */
  reidentifiedTo?: ConductorColor;
  role: ConductorRole;
  awg: Awg;
}

export interface ResolvedCable {
  role: string;
  label: string;
  type: CableType;
  conductors: ResolvedConductor[];
  lengthFt: number;
}

export interface WireNutSpec {
  id: string;
  /** Marketing size, e.g. "yellow", "red". */
  size: string;
  conductorIds: string[];
  /** Pigtail leaving this splice, when present. */
  pigtail?: { color: ConductorColor; toTerminalId: string };
}

export type ConnectionTarget =
  | { kind: "terminal"; terminalId: string; terminalLabel: string }
  | { kind: "wirenut"; wirenutId: string }
  | { kind: "prep" };

/** One step of the make-up sequence — the diagram highlights by `step`. */
export interface ResolvedConnection {
  step: number;
  conductorIds: string[];
  target: ConnectionTarget;
  instruction: string;
}

export interface BoxFillLine {
  label: string;
  count: number;
  /** Allowance per count, quarter-in³. */
  unitAllowance: QuarterIn3;
  total: QuarterIn3;
}

export interface BoxFillResult {
  boxId: string;
  boxLabel: string;
  lines: BoxFillLine[];
  totalFill: QuarterIn3;
  capacity: QuarterIn3;
  pass: boolean;
  /** Smallest catalog box that would pass, when this one doesn't. */
  suggestedBoxId?: string;
}

/** Everything needed to wire one device: the box-level plan. */
export interface DevicePlan {
  deviceId: string;
  circuitId: string;
  kind: DeviceKind;
  configId: string;
  /** Human name: "GFCI 1", "Switch 2" — numbered per kind. */
  displayName: string;
  configLabel: string;
  cables: ResolvedCable[];
  wirenuts: WireNutSpec[];
  connections: ResolvedConnection[];
  boxFill: BoxFillResult;
  notes: string[];
}

export interface CircuitLoadResult {
  circuitId: string;
  volts: number;
  breakerAmps: number;
  capacityVa: number;
  connectedVa: number;
  continuousVa: number;
  /** continuous × 125% + non-continuous (NEC 210.19/210.20). */
  adjustedVa: number;
  /** adjustedVa / capacityVa, percent rounded to integer. */
  pctOfCapacity: number;
  pass: boolean;
}

export interface AdvisorScenarioCircuit {
  breakerAmps: number;
  minAwg: Awg;
  assignedLoadIds: string[];
  /** Load names with unit counts for display, e.g. "3D printer ×3". */
  assignedSummary: string;
  connectedVa: number;
  adjustedVa: number;
  capacityVa: number;
  pctOfCapacity: number;
  pass: boolean;
}

export interface AdvisorScenario {
  id: string;
  title: string;
  circuits: AdvisorScenarioCircuit[];
  pass: boolean;
  /** Smallest remaining headroom across the scenario's circuits. */
  minHeadroomVa: number;
}

export interface AdvisorResult {
  totalConnectedVa: number;
  totalAdjustedVa: number;
  scenarios: AdvisorScenario[];
  recommendedId: string | null;
  notes: string[];
}

export interface PanelDirectoryEntry {
  slot: number;
  label: string;
  amps: number;
  poles: 1 | 2;
  /** Added by this design (vs pre-existing). */
  isNew: boolean;
}

export interface ShoppingLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitCostCents: number;
  homeDepotUrl: string;
  lowesUrl: string;
}

export interface ElectricalTask {
  seq: number;
  title: string;
  detail: string;
  circuitId?: string;
  deviceIds: string[];
  /** Ties a task to a device's connection steps for diagram highlighting. */
  diagramRef?: { deviceId: string };
  /** Key into the generated step illustrations (public/steps/electrical). */
  illustrationId?: string;
  codeNoteIds?: string[];
}

export interface SchematicNode {
  id: string;
  kind: "panel" | "breaker" | "device" | "fixture";
  label: string;
  sub?: string;
  circuitId?: string;
  deviceId?: string;
}

export interface SchematicEdge {
  from: string;
  to: string;
  cable: CableType;
  label: string;
}

export interface SchematicModel {
  nodes: SchematicNode[];
  edges: SchematicEdge[];
}

export interface ElectricalOutput {
  engineVersion: string;
  input: ElectricalInput;
  devicePlans: DevicePlan[];
  circuitLoads: CircuitLoadResult[];
  advisor?: AdvisorResult;
  panelDirectory: PanelDirectoryEntry[];
  schematic: SchematicModel;
  warnings: ElectricalWarning[];
  shopping: ShoppingLine[];
  tasks: ElectricalTask[];
}
