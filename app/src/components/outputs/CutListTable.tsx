import { formatLength, type UnitSystem } from "@/lib/units";
import type { CutItem } from "@/lib/modules/framing/types";
import { ROLE_COLOR } from "@/components/svg/WallElevation";

export function CutListTable({ cutList, system }: { cutList: CutItem[]; system: UnitSystem }) {
  const totalPieces = cutList.reduce((s, c) => s + c.qty, 0);
  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-bp-line-faint text-left">
            <th className="w-4" />
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Qty</th>
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Piece</th>
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Stock</th>
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Cut length</th>
            <th className="bp-dim py-2 text-[10px] uppercase tracking-widest text-bp-line-soft">IDs</th>
          </tr>
        </thead>
        <tbody>
          {cutList.map((c, i) => (
            <tr key={i} className="border-b border-bp-line-faint/40">
              <td className="py-1.5 pr-2">
                {/* swatch matches the 2D/3D member colors */}
                <span
                  className="inline-block h-3.5 w-3.5 rounded-[2px] border"
                  style={{ background: ROLE_COLOR[c.role], borderColor: ROLE_COLOR[c.role], opacity: 0.85 }}
                />
              </td>
              <td className="bp-dim py-1.5 pr-3">{c.qty}×</td>
              <td className="py-1.5 pr-3">
                {c.label}
                {c.treated && (
                  <span className="bp-dim ml-2 rounded-sm border border-bp-warn px-1 text-[9px] uppercase tracking-widest text-bp-warn">
                    PT
                  </span>
                )}
              </td>
              <td className="bp-dim py-1.5 pr-3">{c.size}</td>
              <td className="bp-dim py-1.5 pr-3 text-bp-accent">
                {formatLength(c.length, { system, feetInches: system === "imperial" })}
              </td>
              <td className="bp-dim py-1.5 text-[11px] text-bp-line-soft">{c.memberIds.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bp-dim mt-2 text-[11px] text-bp-line-soft">{totalPieces} pieces total</p>
    </div>
  );
}
