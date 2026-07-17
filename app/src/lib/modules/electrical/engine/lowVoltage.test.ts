import { describe, expect, it } from "vitest";
import { LV_COMPONENTS, LV_RECIPES } from "../data/lowVoltage";
import { computeLvRecipe } from "./lowVoltage";

describe("low-voltage catalog integrity", () => {
  it("has unique component and recipe ids", () => {
    const cids = LV_COMPONENTS.map((c) => c.id);
    expect(new Set(cids).size).toBe(cids.length);
    const rids = LV_RECIPES.map((r) => r.id);
    expect(new Set(rids).size).toBe(rids.length);
  });

  for (const recipe of LV_RECIPES) {
    describe(recipe.id, () => {
      it("resolves every ref, pin, and the power supply", () => {
        // computeLvRecipe throws on any dangling ref/pin/psu
        const result = computeLvRecipe(recipe.id);
        expect(result.instances.length).toBe(recipe.components.length);
        expect(result.wires.length).toBe(recipe.wires.length);
        for (const w of result.wires) {
          expect(w.fromLabel).toContain("·");
          expect(w.toLabel).toContain("·");
        }
      });

      it("fits its power budget with sane math", () => {
        const { budget, warnings } = computeLvRecipe(recipe.id);
        expect(budget.usableMa).toBe(Math.floor(budget.capacityMa * 0.8));
        expect(budget.pct).toBe(Math.round((budget.drawMa / budget.usableMa) * 100));
        expect(budget.pass).toBe(true);
        expect(warnings).toEqual([]);
      });

      it("prices every component into the shopping list", () => {
        const { shopping } = computeLvRecipe(recipe.id);
        expect(shopping.length).toBe(recipe.components.length);
      });

      it("keeps the mains boundary explicit", () => {
        expect(recipe.cautions.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("low-voltage budgets (golden)", () => {
  it("motion-shop-light: 1175 mA on a 12V 2A supply (73%)", () => {
    const { budget } = computeLvRecipe("motion-shop-light");
    expect(budget).toMatchObject({
      volts: 12,
      capacityMa: 2000,
      usableMa: 1600,
      drawMa: 1175, // esp 160 + pir 50 + mosfet 5 + strip 480×2
      pct: 73,
      pass: true,
    });
  });

  it("ws2812-accent: 1960 mA on a 5V 3A supply (82%)", () => {
    const { budget } = computeLvRecipe("ws2812-accent");
    expect(budget).toMatchObject({ drawMa: 1960, usableMa: 2400, pct: 82, pass: true });
  });

  it("throws on unknown recipes", () => {
    expect(() => computeLvRecipe("nonsense")).toThrow(/Unknown/);
  });
});
