import type { ConductorColor, ConductorRole } from "@/lib/modules/electrical/types";

/**
 * Electrical wire palette — scoped to electrical components only (the
 * repo-wide SVG color convention reserves some of these for plumbing).
 */
export const WIRE_COLORS: Record<
  ConductorColor,
  { stroke: string; halo?: string; label: string }
> = {
  // tokens so the print sheet can remap (white wires need outlines on paper)
  black: { stroke: "var(--wire-black)", halo: "var(--wire-black-halo)", label: "black" },
  red: { stroke: "var(--wire-red)", label: "red" },
  white: { stroke: "var(--wire-white)", halo: "var(--wire-white-halo)", label: "white" },
  bare: { stroke: "var(--wire-bare)", label: "bare copper" },
  green: { stroke: "var(--wire-green)", label: "green" },
};

export const SCREW_COLORS: Record<string, string> = {
  brass: "#d9b13b",
  silver: "#c9d4df",
  green: "#10b981",
  black: "#3a3a3a",
  blue: "#3b82f6",
};

export const ROLE_LABELS: Record<ConductorRole, string> = {
  hot: "Hot",
  switched: "Switched hot",
  traveler: "Traveler",
  neutral: "Neutral",
  ground: "Ground",
  spare: "Spare (capped)",
};

export const SHEATH_COLORS: Record<string, string> = {
  white: "#dbe7f3",
  yellow: "#e3c84b",
  orange: "#e8853a",
  black: "#3a3a3a",
};

export const WIRENUT_COLORS: Record<string, string> = {
  orange: "#e8853a",
  yellow: "#e3c84b",
  red: "#ef4444",
  "lever connector": "#9aa7b4",
};

export const SEVERITY_COLORS: Record<string, string> = {
  info: "var(--bp-ok)",
  warn: "var(--bp-warn)",
  danger: "var(--bp-danger)",
};
