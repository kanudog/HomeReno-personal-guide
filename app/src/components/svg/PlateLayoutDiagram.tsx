import { formatLength, type Sixteenths, type UnitSystem } from "@/lib/units";
import type { StudLayout } from "@/lib/modules/framing/types";
import { ROLE_COLOR } from "./WallElevation";

/**
 * Carpenter's plate layout: the plate drawn horizontally to scale with
 * every vertical member's position marked (X on the stud side), labeled,
 * and chained edge-to-edge distances listed below — exactly what you'd
 * transfer onto the real plates with a tape and square.
 */
export function PlateLayoutDiagram({
  layout,
  plate = "bottom",
  system,
}: {
  layout: StudLayout;
  plate?: "bottom" | "top";
  system: UnitSystem;
}) {
  const L = layout.input.length as number;
  const plateT = 24;
  const H = layout.input.height as number;
  const topAssemblyBottom = H - (layout.input.topPlate === "double" ? 2 : 1) * plateT;

  // members that land ON this plate (touch its face)
  const verticals = layout.members
    .filter((m) => m.orientation === "vertical")
    .filter((m) =>
      plate === "bottom"
        ? (m.y as number) === plateT
        : (m.y as number) + (m.h as number) === topAssemblyBottom,
    )
    .sort((a, b) => (a.x as number) - (b.x as number));

  const plateMember = layout.members.find(
    (m) => m.role === (plate === "bottom" ? "plate-bottom" : "plate-top"),
  );

  const fs = Math.max(20, Math.round(L * 0.014));
  const plateH = fs * 2.2;
  const dimLane = plateH + fs * 3.2;
  const padX = fs * 2;
  const padTop = fs * 3;
  const totalH = padTop + dimLane + fs * 5;

  const fmt = (v: number) =>
    formatLength(v as Sixteenths, { system, feetInches: system === "imperial", bare: true });

  // chained distances between successive member left edges + last to wall end
  const chain: { from: number; to: number }[] = [];
  let cursor = 0;
  for (const v of verticals) {
    const x = v.x as number;
    if (x > cursor) chain.push({ from: cursor, to: x });
    cursor = x + (v.w as number);
  }
  if (cursor < L) chain.push({ from: cursor, to: L });

  return (
    <svg
      viewBox={`${-padX} ${-padTop} ${L + padX * 2} ${totalH}`}
      className="h-auto w-full"
      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
    >
      <text x={0} y={-fs * 1.6} fontSize={fs * 0.9} fill="var(--bp-line)">
        {plate === "bottom" ? "BOTTOM" : "TOP"} PLATE LAYOUT — mark X on the stud side of each line
      </text>

      {/* the plate, with door cutouts hatched on the bottom plate */}
      <rect
        x={0}
        y={0}
        width={L}
        height={plateH}
        fill="var(--member-plate)"
        fillOpacity={0.12}
        stroke="var(--member-plate)"
        strokeWidth={fs * 0.08}
      />
      {plate === "bottom" &&
        plateMember?.cutouts?.map((cut, i) => (
          <g key={i}>
            <rect
              x={cut.start as number}
              y={0}
              width={(cut.end as number) - (cut.start as number)}
              height={plateH}
              fill="var(--bp-danger)"
              fillOpacity={0.12}
              stroke="var(--bp-danger)"
              strokeWidth={fs * 0.06}
              strokeDasharray={`${fs * 0.5} ${fs * 0.4}`}
            />
            <text
              x={((cut.start as number) + (cut.end as number)) / 2}
              y={plateH / 2 + fs * 0.32}
              fontSize={fs * 0.62}
              fill="var(--bp-danger)"
              textAnchor="middle"
            >
              CUT OUT AFTER RAISING
            </text>
          </g>
        ))}

      {/* member positions: line at the edge + X on the stud side + rotated ID */}
      {verticals.map((v) => {
        const x = v.x as number;
        const w = v.w as number;
        const color = ROLE_COLOR[v.role];
        return (
          <g key={v.id}>
            <rect x={x} y={0} width={w} height={plateH} fill={color} fillOpacity={0.35} />
            <line x1={x} y1={-fs * 0.5} x2={x} y2={plateH} stroke={color} strokeWidth={fs * 0.07} />
            <text
              x={x + w / 2}
              y={plateH / 2 + fs * 0.3}
              fontSize={Math.min(fs * 0.66, w * 0.7)}
              fill="var(--bp-paper-deep)"
              textAnchor="middle"
              fontWeight={700}
            >
              X
            </text>
            <text
              transform={`translate(${x + w / 2}, ${-fs * 0.8}) rotate(-45)`}
              fontSize={fs * 0.6}
              fill={color}
              textAnchor="start"
            >
              {v.id}
            </text>
          </g>
        );
      })}

      {/* chained clear distances between members */}
      <g stroke="var(--bp-line-soft)" strokeWidth={fs * 0.05}>
        {chain.map((seg, i) => {
          const y = dimLane;
          return (
            <g key={i}>
              <line x1={seg.from} y1={plateH + fs * 0.4} x2={seg.from} y2={y + fs * 0.35} />
              <line x1={seg.to} y1={plateH + fs * 0.4} x2={seg.to} y2={y + fs * 0.35} />
              <line x1={seg.from} y1={y} x2={seg.to} y2={y} />
              {seg.to - seg.from > fs * 2.2 && (
                <text
                  x={(seg.from + seg.to) / 2}
                  y={y - fs * 0.35}
                  fontSize={fs * 0.6}
                  fill="var(--bp-line)"
                  stroke="none"
                  textAnchor="middle"
                >
                  {fmt(seg.to - seg.from)}
                </text>
              )}
            </g>
          );
        })}
        {/* overall */}
        <line x1={0} y1={dimLane + fs * 1.6} x2={L} y2={dimLane + fs * 1.6} />
        <text
          x={L / 2}
          y={dimLane + fs * 1.25}
          fontSize={fs * 0.66}
          fill="var(--bp-line)"
          stroke="none"
          textAnchor="middle"
        >
          {fmt(L)} overall
        </text>
      </g>
    </svg>
  );
}
