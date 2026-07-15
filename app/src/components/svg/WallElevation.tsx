import { formatLength, type Sixteenths, type UnitSystem } from "@/lib/units";
import type { DimensionAnnotation, MemberRole, StudLayout } from "@/lib/modules/framing/types";

/**
 * Dimensioned blueprint elevation of a framed wall. Pure and hook-free so it
 * renders identically in the editor, the /dev gallery, and the print sheet.
 * All coordinates are model-space sixteenths; y is flipped via sy().
 */

export const ROLE_COLOR: Record<MemberRole, string> = {
  "plate-bottom": "var(--member-plate)",
  "plate-top": "var(--member-plate)",
  "plate-cap": "var(--member-plate)",
  "stud-common": "var(--member-stud)",
  "stud-corner": "var(--member-corner)",
  "stud-king": "var(--member-king)",
  "stud-jack": "var(--member-jack)",
  "header-ply": "var(--member-header)",
  "cripple-above": "var(--member-cripple)",
  "cripple-below": "var(--member-cripple)",
  sill: "var(--member-sill)",
  blocking: "var(--member-blocking)",
};

export interface WallElevationProps {
  layout: StudLayout;
  system?: UnitSystem;
  /** Show member ID labels (editor) or keep clean (print thumbnails). */
  showIds?: boolean;
  className?: string;
  /** Extra SVG children rendered in model space (canvas overlays). */
  children?: React.ReactNode;
}

export function WallElevation({
  layout,
  system = "imperial",
  showIds = false,
  className,
  children,
}: WallElevationProps) {
  const L = layout.input.length as number;
  const H = layout.input.height as number;

  const fs = Math.max(28, Math.round(Math.max(L, H) * 0.02)); // model-unit font size
  const laneGap = fs * 2.2;
  const xLanes = Math.max(0, ...layout.dimensions.filter((d) => d.axis === "x").map((d) => d.lane + 1));
  const yLanes = Math.max(0, ...layout.dimensions.filter((d) => d.axis === "y").map((d) => d.lane + 1));
  const padL = yLanes * laneGap + fs * 2.4;
  const padB = xLanes * laneGap + fs * 2.4;
  const padT = fs * 2;
  const padR = fs * 2;

  const sy = (y: number) => H - y; // model y-up → svg y-down

  const fmt = (v: Sixteenths) =>
    formatLength(v, { system, feetInches: system === "imperial", bare: false });

  return (
    <svg
      viewBox={`${-padL} ${-padT} ${L + padL + padR} ${H + padT + padB}`}
      className={className}
      role="img"
      aria-label="Framed wall elevation"
      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
    >
      {/* members (horizontal pieces split at cutouts — e.g. plate sawn at doors) */}
      {layout.members.map((m) => {
        const h = m.h as number;
        const y = sy((m.y as number) + h);
        const color = ROLE_COLOR[m.role];

        const segments: { start: number; end: number }[] = [];
        if (m.cutouts && m.cutouts.length > 0) {
          const cuts = [...m.cutouts].sort((a, b) => (a.start as number) - (b.start as number));
          let cursor = m.x as number;
          for (const c of cuts) {
            if ((c.start as number) > cursor) segments.push({ start: cursor, end: c.start as number });
            cursor = Math.max(cursor, c.end as number);
          }
          const mEnd = (m.x as number) + (m.w as number);
          if (cursor < mEnd) segments.push({ start: cursor, end: mEnd });
        } else {
          segments.push({ start: m.x as number, end: (m.x as number) + (m.w as number) });
        }

        return (
          <g key={m.id}>
            {segments.map((seg, i) => (
              <rect
                key={i}
                x={seg.start}
                y={y}
                width={seg.end - seg.start}
                height={h}
                fill={color}
                fillOpacity={0.16}
                stroke={color}
                strokeWidth={fs * 0.09}
              />
            ))}
            {showIds && m.orientation === "vertical" && h > fs * 3 && (
              <text
                transform={`translate(${(m.x as number) + (m.w as number) / 2}, ${y + h - fs * 1.2}) rotate(-90)`}
                fontSize={Math.min(fs * 0.58, (m.w as number) * 0.8)}
                fill={color}
                textAnchor="start"
                dominantBaseline="middle"
                opacity={0.85}
              >
                {m.id}
              </text>
            )}
          </g>
        );
      })}

      {/* rough opening outlines */}
      {layout.roughOpenings.map((ro) => {
        const x = ro.x as number;
        const w = ro.width as number;
        const h = ro.height as number;
        const y = sy((ro.y as number) + h);
        return (
          <g key={ro.openingId}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke="var(--bp-accent)"
              strokeWidth={fs * 0.08}
              strokeDasharray={`${fs * 0.5} ${fs * 0.35}`}
            />
            <text
              x={x + w / 2}
              y={y + h / 2}
              fontSize={fs * 0.72}
              fill="var(--bp-accent)"
              textAnchor="middle"
              opacity={0.9}
            >
              {ro.kind === "door" ? "DOOR" : "WINDOW"}
            </text>
            <text
              x={x + w / 2}
              y={y + h / 2 + fs}
              fontSize={fs * 0.62}
              fill="var(--bp-accent)"
              textAnchor="middle"
              opacity={0.75}
            >
              RO {fmt(ro.width)} × {fmt(ro.height)}
            </text>
          </g>
        );
      })}

      {/* dimension annotations */}
      {layout.dimensions.map((d, i) => (
        <Dimension
          key={i}
          d={d}
          H={H}
          fs={fs}
          laneGap={laneGap}
          label={`${d.labelPrefix ?? ""}${fmt((d.to - d.from) as Sixteenths)}${d.labelSuffix ?? ""}`}
        />
      ))}

      {children}
    </svg>
  );
}

function Dimension({
  d,
  H,
  fs,
  laneGap,
  label,
}: {
  d: DimensionAnnotation;
  H: number;
  fs: number;
  laneGap: number;
  label: string;
}) {
  const tick = fs * 0.38;
  const stroke = "var(--bp-line-soft)";
  const strokeW = fs * 0.055;

  if (d.axis === "x") {
    const yD = H + (d.lane + 1) * laneGap;
    const from = d.from as number;
    const to = d.to as number;
    return (
      <g stroke={stroke} strokeWidth={strokeW}>
        {/* extension lines from the wall bottom down past the dim line */}
        <line x1={from} y1={H + fs * 0.4} x2={from} y2={yD + tick} />
        <line x1={to} y1={H + fs * 0.4} x2={to} y2={yD + tick} />
        <line x1={from} y1={yD} x2={to} y2={yD} />
        {/* oblique architect ticks */}
        <line x1={from - tick} y1={yD + tick} x2={from + tick} y2={yD - tick} />
        <line x1={to - tick} y1={yD + tick} x2={to + tick} y2={yD - tick} />
        <text
          x={(from + to) / 2}
          y={yD - fs * 0.35}
          fontSize={fs * (d.kind === "spacing" ? 0.62 : 0.72)}
          fill="var(--bp-line)"
          stroke="none"
          textAnchor="middle"
        >
          {label}
        </text>
      </g>
    );
  }

  const xD = -(d.lane + 1) * laneGap;
  const y1 = H - (d.from as number);
  const y2 = H - (d.to as number);
  return (
    <g stroke={stroke} strokeWidth={strokeW}>
      <line x1={-fs * 0.4} y1={y1} x2={xD - tick} y2={y1} />
      <line x1={-fs * 0.4} y1={y2} x2={xD - tick} y2={y2} />
      <line x1={xD} y1={y1} x2={xD} y2={y2} />
      <line x1={xD - tick} y1={y1 - tick} x2={xD + tick} y2={y1 + tick} />
      <line x1={xD - tick} y1={y2 - tick} x2={xD + tick} y2={y2 + tick} />
      <text
        transform={`translate(${xD - fs * 0.35}, ${(y1 + y2) / 2}) rotate(-90)`}
        fontSize={fs * 0.68}
        fill="var(--bp-line)"
        stroke="none"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}
