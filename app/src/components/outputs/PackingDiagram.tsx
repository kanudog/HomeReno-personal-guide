import { formatLength, type Sixteenths, type UnitSystem } from "@/lib/units";
import type { PackingResult } from "@/lib/modules/framing/types";

/**
 * Visual cut plan: each purchased board as a bar with its cuts laid out,
 * kerf-separated, waste hatched at the end. To-scale within each row.
 */
export function PackingDiagram({
  packing,
  system,
}: {
  packing: PackingResult;
  system: UnitSystem;
}) {
  const boards = packing.boards;
  if (boards.length === 0 && packing.precuts.length === 0) return null;

  const maxStock = Math.max(1, ...boards.map((b) => b.stockLength as number));
  const rowH = 34;
  const gap = 14;
  const labelW = 120;
  const W = 860;
  const barW = W - labelW - 10;
  const H = boards.length * (rowH + gap);

  const fmt = (v: number) =>
    formatLength(v as Sixteenths, { system, feetInches: system === "imperial", bare: true });

  return (
    <div>
      {packing.precuts.length > 0 && (
        <p className="bp-dim mb-3 text-sm">
          {packing.precuts.map((p, i) => (
            <span key={i} className="mr-4">
              <span className="text-bp-accent">{p.qty}×</span> {p.size} ×{" "}
              {formatLength(p.length, { system })} precut studs (no cutting)
            </span>
          ))}
        </p>
      )}
      {boards.length > 0 && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          style={{ fontFamily: "var(--font-geist-mono), monospace" }}
        >
          <defs>
            <pattern id="waste-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--bp-line-faint)" strokeWidth="2" />
            </pattern>
          </defs>
          {boards.map((b, i) => {
            const y = i * (rowH + gap);
            const bw = ((b.stockLength as number) / maxStock) * barW;
            let cx = labelW;
            const segs = b.cuts.map((c, j) => {
              const w = ((c.length as number) / maxStock) * barW;
              const seg = { x: cx, w, label: c.label, len: c.length, key: j, memberId: c.memberId };
              cx += w;
              return seg;
            });
            const wasteW = labelW + bw - cx;
            return (
              <g key={i}>
                <text x={0} y={y + rowH / 2 + 4} fontSize={12} fill="var(--bp-line-soft)">
                  {b.size} × {fmt(b.stockLength as number)}
                </text>
                <rect
                  x={labelW}
                  y={y}
                  width={bw}
                  height={rowH}
                  fill="none"
                  stroke="var(--bp-line-soft)"
                  strokeWidth={1.5}
                />
                {segs.map((s) => (
                  <g key={s.key}>
                    <rect
                      x={s.x}
                      y={y}
                      width={s.w}
                      height={rowH}
                      fill="var(--bp-accent)"
                      fillOpacity={0.16}
                      stroke="var(--bp-accent)"
                      strokeWidth={1}
                    />
                    {s.w > 60 && (
                      <>
                        <text x={s.x + s.w / 2} y={y + 14} fontSize={10} fill="var(--bp-line)" textAnchor="middle">
                          {s.memberId}
                        </text>
                        <text x={s.x + s.w / 2} y={y + 27} fontSize={11} fill="var(--bp-accent)" textAnchor="middle">
                          {fmt(s.len as number)}
                        </text>
                      </>
                    )}
                  </g>
                ))}
                {wasteW > 1 && (
                  <rect x={cx} y={y} width={wasteW} height={rowH} fill="url(#waste-hatch)" />
                )}
                {wasteW > 40 && (
                  <text x={cx + wasteW / 2} y={y + rowH / 2 + 4} fontSize={10} fill="var(--bp-line-soft)" textAnchor="middle">
                    {fmt(b.waste as number)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
