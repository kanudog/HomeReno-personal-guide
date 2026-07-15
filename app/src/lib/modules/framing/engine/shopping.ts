import { formatLength, type Sixteenths } from "@/lib/units";
import {
  DEFAULT_STOCK_PRICES_CENTS,
  NAILS_PER_LB,
  NAIL_PRICE_PER_LB_CENTS,
  PRECUT_STUD_PRICES_CENTS,
  PT_STOCK_PRICES_CENTS,
  SHIM_PACK_PRICE_CENTS,
} from "../data/prices";
import type { LumberSize, NailingEntry, PackingResult, ShoppingLine } from "../types";

const search = (q: string) => encodeURIComponent(q);
const hd = (q: string) => `https://www.homedepot.com/s/${search(q)}`;
const lowes = (q: string) => `https://www.lowes.com/search?searchTerm=${search(q)}`;

function stockFeet(len: Sixteenths): number {
  return Math.round((len as number) / 192);
}

/** Build the shopping list from packed boards, precuts, and fastener totals. */
export function generateShoppingList(
  packing: PackingResult,
  nailing: NailingEntry[],
  openingCount = 0,
): ShoppingLine[] {
  const lines: ShoppingLine[] = [];

  // Precut studs
  for (const p of packing.precuts) {
    const inches = (p.length as number) / 16;
    const priceTable = PRECUT_STUD_PRICES_CENTS[p.size] ?? {};
    lines.push({
      id: `precut-${p.size}-${inches}`,
      description: `${p.size} × ${formatLength(p.length)} precut stud (SPF)`,
      qty: p.qty,
      unit: "ea",
      unitCostCents: priceTable[inches] ?? 400,
      homeDepotUrl: hd(`${p.size} ${inches} in precut stud`),
      lowesUrl: lowes(`${p.size} ${Math.round(inches)} inch stud`),
    });
  }

  // Stock boards, grouped by (size, stockLength, treatment)
  const boardGroups = new Map<
    string,
    { size: LumberSize; stockLength: Sixteenths; qty: number; treated: boolean }
  >();
  for (const b of packing.boards) {
    const key = `${b.size}|${b.stockLength}|${b.treated ? "PT" : ""}`;
    const g = boardGroups.get(key);
    if (g) g.qty += 1;
    else
      boardGroups.set(key, {
        size: b.size,
        stockLength: b.stockLength,
        qty: 1,
        treated: !!b.treated,
      });
  }
  for (const g of boardGroups.values()) {
    const ft = stockFeet(g.stockLength);
    const inches = (g.stockLength as number) / 16;
    const priceTable = (g.treated ? PT_STOCK_PRICES_CENTS : DEFAULT_STOCK_PRICES_CENTS)[g.size] ?? {};
    lines.push({
      id: `stock-${g.size}-${ft}${g.treated ? "-pt" : ""}`,
      description: g.treated
        ? `${g.size} × ${ft}' pressure-treated (ground contact — bottom plate)`
        : `${g.size} × ${ft}' (SPF/stud grade)`,
      qty: g.qty,
      unit: "ea",
      unitCostCents: priceTable[inches] ?? (g.treated ? 800 : 500),
      homeDepotUrl: hd(`${g.size} ${ft} ft ${g.treated ? "pressure treated " : ""}lumber`),
      lowesUrl: lowes(`${g.size} ${ft} ft ${g.treated ? "pressure treated " : ""}lumber`),
    });
  }

  // Shims for setting doors/windows plumb in their ROs
  if (openingCount > 0) {
    lines.push({
      id: "shims",
      description: `Cedar shims (setting ${openingCount} door/window unit${openingCount > 1 ? "s" : ""} plumb)`,
      qty: Math.max(1, Math.ceil(openingCount / 2)),
      unit: "pack",
      unitCostCents: SHIM_PACK_PRICE_CENTS,
      homeDepotUrl: hd("cedar shims"),
      lowesUrl: lowes("cedar shims"),
    });
  }

  // Fasteners → pounds per fastener type
  const byFastener = new Map<string, number>();
  for (const n of nailing) {
    byFastener.set(n.fastener, (byFastener.get(n.fastener) ?? 0) + n.count);
  }
  for (const [fastener, count] of byFastener) {
    const perLb = NAILS_PER_LB[fastener] ?? 50;
    const lbs = Math.max(1, Math.ceil((count / perLb) * 1.15)); // 15% overage
    lines.push({
      id: `nails-${fastener.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      description: `${fastener} nails (~${count} needed)`,
      qty: lbs,
      unit: "lb",
      unitCostCents: NAIL_PRICE_PER_LB_CENTS,
      homeDepotUrl: hd(`${fastener} framing nails`),
      lowesUrl: lowes(`${fastener} framing nails`),
    });
  }

  return lines;
}
