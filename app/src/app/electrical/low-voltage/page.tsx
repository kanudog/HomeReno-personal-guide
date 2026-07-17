"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LV_RECIPES } from "@/lib/modules/electrical/data/lowVoltage";
import { computeLvRecipe } from "@/lib/modules/electrical/engine/lowVoltage";
import { LvDiagram } from "@/components/electrical/svg/LvDiagram";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const WIRE_CHIP: Record<string, string> = {
  red: "var(--wire-red)",
  black: "var(--wire-black)",
  yellow: "#e3c84b",
  green: "var(--wire-green)",
  blue: "#3b82f6",
  white: "var(--wire-white)",
};

/**
 * Low-Voltage Lab: ESP32/Home-Assistant recipes — component diagrams,
 * wire-by-wire tables, power budgets, parts lists, and ESPHome configs.
 */
export default function LowVoltagePage() {
  const [recipeId, setRecipeId] = useState(LV_RECIPES[0]!.id);
  const [activeWire, setActiveWire] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      return computeLvRecipe(recipeId);
    } catch {
      return null;
    }
  }, [recipeId]);

  const total = result?.shopping.reduce((n, l) => n + l.unitCostCents * l.qty, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl grow px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/electrical"
            className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
          >
            ← Designer
          </Link>
          <h1 className="bp-panel-title text-xl">Low-Voltage Lab</h1>
        </div>
        <p className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
          ESP32 + ESPHome · Class-2 only
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {LV_RECIPES.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setRecipeId(r.id);
              setActiveWire(null);
              setCopied(false);
            }}
            className={`bp-dim rounded-sm border px-3 py-2 text-[11px] uppercase tracking-widest transition-colors ${
              recipeId === r.id
                ? "border-bp-accent text-bp-accent"
                : "border-bp-line-faint text-bp-line-soft hover:text-bp-line"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {result && (
        <>
          <p className="mb-3 max-w-3xl text-sm text-bp-line-soft">{result.recipe.description}</p>

          {result.recipe.cautions.map((c, i) => (
            <p
              key={i}
              className="bp-dim mb-2 max-w-3xl rounded-sm border-l-4 bg-bp-paper-deep p-2.5 text-[12px] text-bp-line-soft"
              style={{ borderLeftColor: "var(--bp-warn)" }}
            >
              ⚠ {c}
            </p>
          ))}

          <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
            <section className="bp-panel p-3">
              <LvDiagram instances={result.instances} wires={result.wires} activeWire={activeWire} />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span
                  className={`bp-dim rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    result.budget.pass ? "border-bp-ok text-bp-ok" : "border-bp-danger text-bp-danger"
                  }`}
                >
                  Power: ~{result.budget.drawMa} mA of {result.budget.usableMa} mA usable (
                  {result.budget.pct}%) · {result.budget.psuLabel}
                </span>
                {result.warnings.map((w, i) => (
                  <span key={i} className="bp-dim text-[11px] text-bp-danger">
                    {w}
                  </span>
                ))}
              </div>
            </section>

            <section className="bp-panel p-3">
              <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
                Wire by wire (click to highlight)
              </p>
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  {result.wires.map((w) => (
                    <tr
                      key={w.step}
                      onClick={() => setActiveWire(activeWire === w.step ? null : w.step)}
                      className={`cursor-pointer border-b border-bp-line-faint/40 transition-colors ${
                        activeWire === w.step ? "bg-bp-paper-raised/60" : "hover:bg-bp-paper-raised/30"
                      }`}
                    >
                      <td className="bp-dim w-6 py-1.5 pr-1 text-bp-accent">{w.step + 1}</td>
                      <td className="w-8 py-1.5 pr-2">
                        <span
                          className="inline-block h-2 w-6 rounded-full"
                          style={{ backgroundColor: WIRE_CHIP[w.color] }}
                        />
                      </td>
                      <td className="py-1.5 text-bp-line-soft">
                        {w.fromLabel} <span className="text-bp-accent">→</span> {w.toLabel}
                        {w.note && <span className="bp-dim block text-[10px] text-bp-warn">{w.note}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="bp-panel p-4">
              <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
                Build steps
              </p>
              <ol className="flex flex-col gap-2.5">
                {result.recipe.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-bp-line-soft">
                    <span className="bp-dim mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bp-accent text-[11px] text-bp-accent">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>

              {result.recipe.esphomeYaml && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
                      ESPHome config
                    </p>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(result.recipe.esphomeYaml!);
                        setCopied(true);
                      }}
                      className="bp-dim rounded-sm border border-bp-line-faint px-2 py-1 text-[10px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <pre className="bp-dim overflow-x-auto rounded-sm border border-bp-line-faint bg-bp-paper-deep p-3 text-[11px] leading-relaxed text-bp-line-soft">
                    {result.recipe.esphomeYaml}
                  </pre>
                </div>
              )}
            </section>

            <section className="bp-panel p-4">
              <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
                Parts list
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-bp-line-faint text-left">
                    <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Qty</th>
                    <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Part</th>
                    <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Est.</th>
                    <th className="bp-dim py-2 text-[10px] uppercase tracking-widest text-bp-line-soft">Buy</th>
                  </tr>
                </thead>
                <tbody>
                  {result.shopping.map((l) => (
                    <tr key={l.id} className="border-b border-bp-line-faint/40">
                      <td className="bp-dim py-1.5 pr-3">{l.qty}</td>
                      <td className="py-1.5 pr-3 text-[13px]">{l.description}</td>
                      <td className="bp-dim py-1.5 pr-3 text-bp-accent">{dollars(l.unitCostCents * l.qty)}</td>
                      <td className="bp-dim py-1.5 text-[11px]">
                        <a href={l.homeDepotUrl} target="_blank" rel="noreferrer" className="text-bp-line-soft underline hover:text-bp-accent">
                          Amazon
                        </a>
                        {" · "}
                        <a href={l.lowesUrl} target="_blank" rel="noreferrer" className="text-bp-line-soft underline hover:text-bp-accent">
                          AliExpress
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="bp-dim py-2 text-right text-[11px] uppercase tracking-widest text-bp-line-soft">
                      Estimated total
                    </td>
                    <td className="bp-dim py-2 text-bp-accent">{dollars(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <p className="bp-dim mt-1 text-[10px] text-bp-line-soft">
                Ballpark hobby-parts pricing — Amazon is faster, AliExpress is cheaper in fives.
              </p>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
