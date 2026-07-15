import type { Sixteenths } from "@/lib/units";

export type LumberSize = "2x4" | "2x6" | "2x8" | "2x10" | "2x12";

export type OpeningKind = "door" | "window";

export interface OpeningInput {
  id: string;
  kind: OpeningKind;
  /** Distance from the wall's left end to the LEFT EDGE of the rough opening. */
  offset: Sixteenths;
  /** Manufacturer unit dimensions (door slab / window unit). */
  unitWidth: Sixteenths;
  unitHeight: Sixteenths;
  /** Direct rough-opening override — skips tolerance math when provided. */
  roOverride?: { width: Sixteenths; height: Sixteenths };
  /**
   * Windows only: floor to the BOTTOM of the rough opening (sill top).
   * Doors ignore this (their RO starts at the subfloor).
   */
  sillHeight?: Sixteenths;
}

export type CornerStyle = "none" | "california" | "double";

export interface WallInput {
  /** Overall wall length. */
  length: Sixteenths;
  /** Full framed wall height, plates included (e.g. 97 1/8" for an 8' ceiling). */
  height: Sixteenths;
  studSize: LumberSize;
  /** On-center stud spacing (16" or 24" typically). */
  spacingOC: Sixteenths;
  topPlate: "single" | "double";
  loadBearing: boolean;
  /** Bottom plate in ground/concrete contact must be pressure-treated. */
  bottomPlatePT: boolean;
  /** Optional row of horizontal blocking between studs. */
  fireBlocking?: { enabled: boolean; height?: Sixteenths };
  /** Corner framing at each end (set by the room planner or manually). */
  corners?: { start: CornerStyle; end: CornerStyle };
  openings: OpeningInput[];
}

export type MemberRole =
  | "plate-bottom"
  | "plate-top"
  | "plate-cap"
  | "stud-common"
  | "stud-corner"
  | "stud-king"
  | "stud-jack"
  | "header-ply"
  | "cripple-above"
  | "cripple-below"
  | "sill"
  | "blocking";

export type MemberOrientation = "vertical" | "horizontal" | "flat";

export interface FramingMember {
  /** Stable id, e.g. "S3", "K1-L", "HDR1-A". */
  id: string;
  role: MemberRole;
  size: LumberSize;
  /** Elevation placement: x from wall left, y from floor — to the member's min corner. */
  x: Sixteenths;
  y: Sixteenths;
  /** Footprint in the elevation: width along x, height along y. */
  w: Sixteenths;
  h: Sixteenths;
  /** Cut length of the piece of lumber. */
  length: Sixteenths;
  orientation: MemberOrientation;
  openingId?: string;
  label: string;
  /** Pressure-treated lumber (ground-contact plates). */
  treated?: boolean;
  /**
   * Spans removed AFTER assembly (door openings sawn out of the bottom
   * plate once the wall is raised). Absolute wall-x ranges. The cut list
   * still buys the full-length piece; renderers draw the gaps.
   */
  cutouts?: { start: Sixteenths; end: Sixteenths }[];
}

export interface ResolvedOpening {
  openingId: string;
  /** Human name: "Door 1", "Window 2" — numbered per kind, left to right. */
  displayName: string;
  kind: OpeningKind;
  /** Rough opening rect in wall coordinates. */
  x: Sixteenths;
  y: Sixteenths;
  width: Sixteenths;
  height: Sixteenths;
  headerSpec: HeaderSpec;
}

export interface HeaderSpec {
  size: LumberSize;
  plies: number;
  orientation: MemberOrientation; // "vertical" plies on edge, "flat" for non-load-bearing
  /** Vertical depth of the assembled header in the elevation. */
  depth: Sixteenths;
  /** e.g. 1/2" plywood spacer between plies in a 2x4 wall. */
  spacerNote?: string;
  /** Set when the span exceeded the sizing table. */
  engineered?: boolean;
}

export type WarningCode =
  | "opening-out-of-bounds"
  | "openings-overlap"
  | "header-span-exceeds-table"
  | "header-does-not-fit"
  | "cripple-sliver"
  | "sill-below-plate"
  | "opening-near-wall-end"
  | "plate-spliced";

export interface EngineWarning {
  code: WarningCode;
  message: string;
  openingId?: string;
}

export interface DimensionAnnotation {
  axis: "x" | "y";
  /** Model-space start/end along the axis. */
  from: Sixteenths;
  to: Sixteenths;
  /** 0 = closest to the wall; higher lanes step outward. */
  lane: number;
  /**
   * Semantic decoration around the formatted length — the renderer formats
   * the value in the active unit system (engine stays display-agnostic).
   */
  labelPrefix?: string;
  labelSuffix?: string;
  kind: "overall" | "opening" | "spacing" | "height" | "header" | "sill";
}

export interface StudLayout {
  input: WallInput;
  engineVersion: string;
  members: FramingMember[];
  roughOpenings: ResolvedOpening[];
  dimensions: DimensionAnnotation[];
  warnings: EngineWarning[];
}

export interface CutItem {
  label: string;
  size: LumberSize;
  length: Sixteenths;
  qty: number;
  memberIds: string[];
  /** Role drives the color swatch shared with the 2D/3D views. */
  role: MemberRole;
  treated?: boolean;
}

export interface PackedStock {
  size: LumberSize;
  /** Purchased stock length. */
  stockLength: Sixteenths;
  cuts: { label: string; length: Sixteenths; memberId: string }[];
  waste: Sixteenths;
  /** Pressure-treated stock — packed separately from untreated. */
  treated?: boolean;
}

export interface PrecutPurchase {
  size: LumberSize;
  length: Sixteenths;
  qty: number;
  label: string;
}

export interface PackingResult {
  boards: PackedStock[];
  precuts: PrecutPurchase[];
}

export interface NailingEntry {
  joint: string;
  fastener: string;
  pattern: string;
  count: number;
  codeRef?: string;
}

export interface ShoppingLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  /** Editable default; cents to avoid float money. */
  unitCostCents: number;
  homeDepotUrl: string;
  lowesUrl: string;
}

export interface AssemblyTask {
  seq: number;
  title: string;
  detail: string;
  /** Matches Solid.assemblyStep for the 3D step-through. */
  assemblyStep: number | null;
  memberIds: string[];
  /** Code callouts relevant at this step (ids into CODE_NOTES). */
  codeNoteIds?: string[];
}

export interface FramingOutput {
  layout: StudLayout;
  cutList: CutItem[];
  packing: PackingResult;
  nailing: NailingEntry[];
  shopping: ShoppingLine[];
  tasks: AssemblyTask[];
}
