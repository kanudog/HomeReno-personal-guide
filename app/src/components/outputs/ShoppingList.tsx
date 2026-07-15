"use client";

import type { ShoppingLine } from "@/lib/modules/framing/types";
import { useEditor } from "@/stores/editor";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ShoppingList({
  lines,
  readOnly = false,
}: {
  lines: ShoppingLine[];
  readOnly?: boolean;
}) {
  const costOverrides = useEditor((s) => s.costOverrides);
  const setCostOverride = useEditor((s) => s.setCostOverride);

  const cost = (l: ShoppingLine) => costOverrides[l.id] ?? l.unitCostCents;
  const total = lines.reduce((s, l) => s + cost(l) * l.qty, 0);

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-bp-line-faint text-left">
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Qty</th>
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Item</th>
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Unit cost</th>
            <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Line</th>
            {!readOnly && (
              <th className="bp-dim py-2 text-[10px] uppercase tracking-widest text-bp-line-soft">Buy</th>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-bp-line-faint/40">
              <td className="bp-dim py-1.5 pr-3">
                {l.qty} {l.unit}
              </td>
              <td className="py-1.5 pr-3">{l.description}</td>
              <td className="bp-dim py-1.5 pr-3">
                {readOnly ? (
                  dollars(cost(l))
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={(cost(l) / 100).toFixed(2)}
                    key={`${l.id}-${cost(l)}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (!Number.isNaN(v) && v >= 0) setCostOverride(l.id, Math.round(v * 100));
                    }}
                    className="bp-dim h-8 w-20 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-bp-line outline-none focus:border-bp-accent"
                  />
                )}
              </td>
              <td className="bp-dim py-1.5 pr-3 text-bp-accent">{dollars(cost(l) * l.qty)}</td>
              {!readOnly && (
                <td className="bp-dim py-1.5 text-[11px]">
                  <a href={l.homeDepotUrl} target="_blank" rel="noreferrer" className="text-bp-line-soft underline hover:text-bp-accent">
                    HD
                  </a>
                  {" · "}
                  <a href={l.lowesUrl} target="_blank" rel="noreferrer" className="text-bp-line-soft underline hover:text-bp-accent">
                    Lowe&apos;s
                  </a>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="bp-dim py-2 text-right text-[11px] uppercase tracking-widest text-bp-line-soft">
              Estimated total
            </td>
            <td className="bp-dim py-2 text-bp-accent">{dollars(total)}</td>
            {!readOnly && <td />}
          </tr>
        </tfoot>
      </table>
      <p className="bp-dim mt-1 text-[10px] text-bp-line-soft">
        Prices are editable estimates — tap a unit cost to correct it after a store run.
      </p>
    </div>
  );
}
