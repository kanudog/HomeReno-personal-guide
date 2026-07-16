/**
 * Top-down closeup of the two supported corner assemblies, with nailing
 * callouts. Generic teaching diagram — colors match the member palette.
 */
export function CornerDetail({ style }: { style: "california" | "double" }) {
  const stud = "var(--member-stud)";
  const corner = "var(--member-corner)";
  const butt = "var(--member-king)";
  const piece = (x: number, y: number, w: number, h: number, color: string) => (
    <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.6} />
  );

  return (
    <svg
      viewBox="0 0 360 240"
      className="h-auto w-full max-w-md"
      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
      role="img"
      aria-label="Corner framing detail (top-down)"
    >
      <text x={12} y={22} fontSize={13} fill="var(--bp-line)">
        {style === "california" ? "CALIFORNIA CORNER (top-down)" : "DOUBLE-STUD CORNER (top-down)"}
      </text>

      {/* through wall runs left-to-right; butt wall comes from the bottom */}
      <text x={12} y={44} fontSize={10} fill="var(--bp-line-soft)">
        through wall →
      </text>
      <text x={296} y={215} fontSize={10} fill="var(--bp-line-soft)" textAnchor="end">
        ↑ butt wall
      </text>

      {/* through wall plates (top-down we see the plate band) */}
      {piece(12, 52, 336, 42, "var(--member-plate)")}

      {style === "california" ? (
        <>
          {/* end stud + setback backer stud */}
          {piece(306, 55, 18, 36, corner)}
          {piece(240, 55, 18, 36, corner)}
          {/* butt wall end stud nailing into the gap face */}
          {piece(288, 96, 36, 110, butt)}
          <text x={252} y={130} fontSize={10} fill={corner} textAnchor="end">
            backer stud —
          </text>
          <text x={252} y={143} fontSize={10} fill={corner}>
            drywall lands here
          </text>
        </>
      ) : (
        <>
          {piece(306, 55, 18, 36, corner)}
          {piece(286, 55, 18, 36, corner)}
          {piece(288, 96, 36, 110, butt)}
        </>
      )}

      {/* nail arrows */}
      <g stroke="var(--bp-ok)" strokeWidth={1.4} fill="none">
        <line x1={306} y1={150} x2={315} y2={92} />
        <polygon points="315,92 311,101 318,100" fill="var(--bp-ok)" stroke="none" />
      </g>
      <text x={180} y={165} fontSize={10} fill="var(--bp-ok)">
        16d @ 12&Prime; OC through butt-wall
      </text>
      <text x={180} y={178} fontSize={10} fill="var(--bp-ok)">
        end stud into corner assembly
      </text>

      <text x={12} y={228} fontSize={9.5} fill="var(--bp-line-soft)">
        {style === "california"
          ? "3 studs total; interior drywall backing without a wasted 4th stud."
          : "Simple two-stud corner; add a backer or drywall clips for the inside face."}
      </text>
    </svg>
  );
}
