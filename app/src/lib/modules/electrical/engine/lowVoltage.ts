import type { ShoppingLine } from "../types";
import {
  lvComponent,
  lvRecipe,
  type LvComponent,
  type LvRecipe,
  type LvWire,
} from "../data/lowVoltage";

/**
 * Resolve a low-voltage recipe: instance list, labeled wires, a power
 * budget against the primary supply, and a shopping list. Pure data →
 * deterministic and unit-tested like the mains engine.
 */

export interface LvInstance {
  ref: string;
  component: LvComponent;
  qty: number;
  label: string;
}

export interface LvResolvedWire extends LvWire {
  step: number;
  fromLabel: string;
  toLabel: string;
}

export interface LvPowerBudget {
  psuRef: string;
  psuLabel: string;
  volts: number;
  capacityMa: number;
  /** 80% continuous ceiling, matching the mains habit. */
  usableMa: number;
  drawMa: number;
  pct: number;
  pass: boolean;
}

export interface LvResult {
  recipe: LvRecipe;
  instances: LvInstance[];
  wires: LvResolvedWire[];
  budget: LvPowerBudget;
  shopping: ShoppingLine[];
  warnings: string[];
}

const search = (q: string) => encodeURIComponent(q);

export function computeLvRecipe(recipeId: string): LvResult {
  const recipe = lvRecipe(recipeId);
  if (!recipe) throw new Error(`Unknown low-voltage recipe: ${recipeId}`);
  const warnings: string[] = [];

  const instances: LvInstance[] = recipe.components.map((c) => {
    const component = lvComponent(c.componentId);
    if (!component) throw new Error(`${recipe.id}: unknown component ${c.componentId}`);
    return {
      ref: c.ref,
      component,
      qty: c.qty ?? 1,
      label: c.label ?? component.label,
    };
  });
  const byRef = new Map(instances.map((i) => [i.ref, i]));

  const pinLabel = (ref: string, pinId: string): string => {
    const inst = byRef.get(ref);
    if (!inst) throw new Error(`${recipe.id}: wire references missing component "${ref}"`);
    const pin = inst.component.pins.find((p) => p.id === pinId);
    if (!pin) throw new Error(`${recipe.id}: ${ref} has no pin "${pinId}"`);
    return `${inst.label} · ${pin.label}`;
  };

  const wires: LvResolvedWire[] = recipe.wires.map((w, i) => ({
    ...w,
    step: i,
    fromLabel: pinLabel(w.from.ref, w.from.pin),
    toLabel: pinLabel(w.to.ref, w.to.pin),
  }));

  // ---- power budget -----------------------------------------------------------
  const psu = byRef.get(recipe.psuRef);
  if (!psu?.component.supplyMa) throw new Error(`${recipe.id}: psuRef isn't a power supply`);
  const drawMa = instances
    .filter((i) => i.ref !== recipe.psuRef)
    .reduce((n, i) => n + (i.component.drawMa ?? 0) * i.qty, 0);
  const capacityMa = psu.component.supplyMa;
  const usableMa = Math.floor(capacityMa * 0.8);
  const budget: LvPowerBudget = {
    psuRef: psu.ref,
    psuLabel: psu.label,
    volts: psu.component.supplyVolts ?? 0,
    capacityMa,
    usableMa,
    drawMa,
    pct: Math.round((drawMa / usableMa) * 100),
    pass: drawMa <= usableMa,
  };
  if (!budget.pass) {
    warnings.push(
      `Power budget: ~${drawMa} mA draw exceeds the ${psu.label}'s 80% ceiling (${usableMa} mA) — size the supply up or shorten the strip.`,
    );
  }

  // ---- shopping ------------------------------------------------------------------
  const shopping: ShoppingLine[] = instances.map((i) => ({
    id: `lv-${recipe.id}-${i.ref}`,
    description: i.label + (i.component.note ? ` — ${i.component.note}` : ""),
    qty: i.qty,
    unit: "ea",
    unitCostCents: i.component.priceCents,
    homeDepotUrl: `https://www.amazon.com/s?k=${search(i.component.shoppingQuery)}`,
    lowesUrl: `https://www.aliexpress.com/w/wholesale-${search(i.component.shoppingQuery)}.html`,
  }));

  return { recipe, instances, wires, budget, shopping, warnings };
}
