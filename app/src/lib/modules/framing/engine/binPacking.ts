import type { Sixteenths } from "@/lib/units";
import { KERF, PRECUT_STUD_LENGTHS, STOCK_LENGTHS } from "../data/lumber";
import type { CutItem, LumberSize, PackedStock, PackingResult, PrecutPurchase } from "../types";

interface Bin {
  size: LumberSize;
  treated: boolean;
  stockLength: number;
  cuts: { label: string; length: Sixteenths; memberId: string }[];
  used: number; // sum of cut lengths + kerf between cuts
}

/**
 * First-fit-decreasing 1D packing onto purchasable stock, with saw kerf
 * between cuts. Cuts that exactly match a precut stud length are bought
 * as precuts (cheaper, no cutting) instead of being packed.
 */
export function packCuts(cutList: CutItem[]): PackingResult {
  const precuts: PrecutPurchase[] = [];
  const toPack: {
    size: LumberSize;
    treated: boolean;
    length: number;
    label: string;
    memberId: string;
  }[] = [];

  for (const item of cutList) {
    const isPrecut =
      !item.treated &&
      (item.size === "2x4" || item.size === "2x6") &&
      PRECUT_STUD_LENGTHS.some((p) => (p as number) === (item.length as number));
    if (isPrecut) {
      const existing = precuts.find(
        (p) => p.size === item.size && (p.length as number) === (item.length as number),
      );
      if (existing) existing.qty += item.qty;
      else
        precuts.push({
          size: item.size,
          length: item.length,
          qty: item.qty,
          label: "Precut stud",
        });
      continue;
    }
    item.memberIds.forEach((memberId) => {
      toPack.push({
        size: item.size,
        treated: !!item.treated,
        length: item.length as number,
        label: item.label,
        memberId,
      });
    });
  }

  const kerf = KERF as number;
  const stockAsc = STOCK_LENGTHS.map((s) => s as number).sort((a, b) => a - b);
  const longest = stockAsc[stockAsc.length - 1]!;

  const bins: Bin[] = [];
  // FFD per (lumber size, treatment) — PT never shares a board with untreated
  const byClass = new Map<string, typeof toPack>();
  for (const cut of toPack) {
    const key = `${cut.size}|${cut.treated ? "PT" : "STD"}`;
    const arr = byClass.get(key) ?? [];
    arr.push(cut);
    byClass.set(key, arr);
  }

  for (const cuts of byClass.values()) {
    cuts.sort((a, b) => b.length - a.length);
    for (const cut of cuts) {
      if (cut.length > longest) {
        // shouldn't happen (layout splices plates) — pack onto longest and flag via waste<0
        bins.push({
          size: cut.size,
          treated: cut.treated,
          stockLength: longest,
          cuts: [{ label: cut.label, length: cut.length as Sixteenths, memberId: cut.memberId }],
          used: cut.length,
        });
        continue;
      }
      let placed = false;
      for (const bin of bins) {
        if (bin.size !== cut.size || bin.treated !== cut.treated) continue;
        const needed = bin.used + kerf + cut.length;
        if (needed <= bin.stockLength) {
          bin.cuts.push({ label: cut.label, length: cut.length as Sixteenths, memberId: cut.memberId });
          bin.used = needed;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const stock = stockAsc.find((s) => s >= cut.length)!;
        bins.push({
          size: cut.size,
          treated: cut.treated,
          stockLength: stock,
          cuts: [{ label: cut.label, length: cut.length as Sixteenths, memberId: cut.memberId }],
          used: cut.length,
        });
      }
    }
  }

  // Shrink pass: reduce each bin to the smallest stock that still fits
  const boards: PackedStock[] = bins.map((bin) => {
    const smallest = stockAsc.find((s) => s >= bin.used) ?? bin.stockLength;
    return {
      size: bin.size,
      treated: bin.treated || undefined,
      stockLength: smallest as Sixteenths,
      cuts: bin.cuts,
      waste: (smallest - bin.used) as Sixteenths,
    };
  });

  boards.sort(
    (a, b) =>
      a.size.localeCompare(b.size) ||
      (b.stockLength as number) - (a.stockLength as number) ||
      (a.waste as number) - (b.waste as number),
  );

  return { boards, precuts };
}
