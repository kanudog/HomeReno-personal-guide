import { ROLE_COLOR } from "./WallElevation";
import type { MemberRole } from "@/lib/modules/framing/types";

/**
 * Generic annotated mini-wall: which piece is which. Colors match the
 * cut list swatches and the 2D/3D views. Pure SVG, theme-aware.
 */
const CALLOUTS: {
  role: MemberRole;
  name: string;
  // arrow tip (on the piece) and label anchor, in the 560×360 canvas
  tip: [number, number];
  at: [number, number];
  align?: "start" | "end";
}[] = [
  { role: "plate-cap", name: "Cap plate", tip: [130, 34], at: [40, 18], align: "start" },
  { role: "plate-top", name: "Top plate", tip: [150, 52], at: [252, 24], align: "start" },
  { role: "cripple-above", name: "Cripples (above header)", tip: [215, 78], at: [320, 56], align: "start" },
  { role: "header-ply", name: "Header", tip: [215, 108], at: [330, 96], align: "start" },
  { role: "stud-king", name: "King stud (full height)", tip: [162, 170], at: [30, 130], align: "start" },
  { role: "stud-jack", name: "Jack stud (carries header)", tip: [186, 190], at: [30, 208], align: "start" },
  { role: "sill", name: "Window sill", tip: [240, 218], at: [340, 196], align: "start" },
  { role: "cripple-below", name: "Cripples (below sill)", tip: [240, 268], at: [340, 250], align: "start" },
  { role: "stud-common", name: "Common stud (16″ OC)", tip: [388, 180], at: [420, 140], align: "start" },
  { role: "blocking", name: "Fire block (optional)", tip: [420, 230], at: [430, 268], align: "start" },
  { role: "plate-bottom", name: "Bottom plate (PT)", tip: [150, 322], at: [40, 344], align: "start" },
];

export function PieceLegend() {
  const c = (r: MemberRole) => ROLE_COLOR[r];
  const piece = (
    x: number,
    y: number,
    w: number,
    h: number,
    role: MemberRole,
    key?: string,
  ) => (
    <rect
      key={key}
      x={x}
      y={y}
      width={w}
      height={h}
      fill={c(role)}
      fillOpacity={0.2}
      stroke={c(role)}
      strokeWidth={1.4}
    />
  );

  return (
    <svg
      viewBox="0 0 560 360"
      className="h-auto w-full"
      role="img"
      aria-label="Framing piece legend"
      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
    >
      {/* generic wall: window bay left, plain bays right */}
      {piece(120, 28, 320, 12, "plate-cap")}
      {piece(120, 42, 320, 12, "plate-top")}
      {piece(120, 316, 320, 12, "plate-bottom")}

      {/* kings + jacks + header + sill for a window */}
      {piece(156, 54, 12, 262, "stud-king")}
      {piece(292, 54, 12, 262, "stud-king")}
      {piece(170, 96, 12, 220, "stud-jack")}
      {piece(280, 96, 12, 220, "stud-jack")}
      {piece(168, 96, 124, 26, "header-ply")}
      {piece(182, 212, 96, 12, "sill")}
      {/* cripples above + below */}
      {piece(206, 54, 12, 40, "cripple-above")}
      {piece(240, 54, 12, 40, "cripple-above")}
      {piece(182, 226, 12, 90, "cripple-below")}
      {piece(230, 226, 12, 90, "cripple-below")}
      {piece(266, 226, 12, 90, "cripple-below")}
      {/* window RO */}
      <rect
        x={182}
        y={124}
        width={96}
        height={88}
        fill="none"
        stroke="var(--bp-accent)"
        strokeWidth={1.2}
        strokeDasharray="6 4"
      />

      {/* common studs + one fire block */}
      {piece(340, 54, 12, 262, "stud-common")}
      {piece(384, 54, 12, 262, "stud-common")}
      {piece(428, 54, 12, 262, "stud-common")}
      {piece(352, 224, 32, 12, "blocking")}
      {piece(396, 236, 32, 12, "blocking")}

      {/* callouts */}
      {CALLOUTS.map((k) => (
        <g key={k.role + k.name}>
          <line
            x1={k.at[0] + (k.align === "end" ? -4 : 4)}
            y1={k.at[1] + 4}
            x2={k.tip[0]}
            y2={k.tip[1]}
            stroke="var(--bp-line-soft)"
            strokeWidth={0.9}
          />
          <circle cx={k.tip[0]} cy={k.tip[1]} r={2.2} fill={c(k.role)} />
          <text
            x={k.at[0]}
            y={k.at[1]}
            fontSize={11}
            fill={c(k.role)}
            textAnchor={k.align ?? "start"}
          >
            {k.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
