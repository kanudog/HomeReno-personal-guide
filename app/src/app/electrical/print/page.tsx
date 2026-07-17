"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { computeElectrical } from "@/lib/modules/electrical";
import { electricalCodeNote } from "@/lib/modules/electrical/data/codeNotes";
import { PictorialBox } from "@/components/electrical/svg/PictorialBox";
import { CircuitSchematic } from "@/components/electrical/svg/CircuitSchematic";
import { PanelDirectoryLabel } from "@/components/electrical/outputs/PanelDirectoryLabel";
import { ShoppingList } from "@/components/outputs/ShoppingList";
import { useElectrical } from "@/stores/electrical";

/**
 * Printable circuit sheet: schematic, per-device wiring diagrams with
 * numbered make-up steps, panel directory label, shopping list.
 * White paper, dark ink — browser print-to-PDF is the export path.
 */
export default function ElectricalPrintPage() {
  const input = useElectrical((s) => s.input);
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString()), []);

  const output = useMemo(() => {
    try {
      return computeElectrical(input);
    } catch {
      return null;
    }
  }, [input]);

  if (!output) {
    return <p className="p-6">Nothing to print — design a circuit first.</p>;
  }

  const deviceCount = output.devicePlans.length;

  return (
    <div className="print-sheet mx-auto min-h-screen w-full max-w-[10.5in] px-6 py-5">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/electrical" className="bp-dim text-[11px] uppercase tracking-widest underline">
          ← back to designer
        </Link>
        <button
          onClick={() => window.print()}
          className="bp-dim rounded-sm border border-bp-accent px-4 py-2 text-[11px] uppercase tracking-widest text-bp-accent"
        >
          Print / Save PDF
        </button>
      </div>

      {/* title block */}
      <div className="print-avoid-break mb-4 flex items-stretch justify-between border-2 border-bp-line">
        <div className="px-4 py-2">
          <h1 className="bp-panel-title text-xl">HomeReno — Electrical Circuit Sheet</h1>
          <p className="bp-dim text-[11px] text-bp-line-soft">
            {input.panel.label} · {input.circuits.length} circuit(s) · {deviceCount} device(s) ·{" "}
            {input.circuits.map((c) => `${c.name} (${c.breakerAmps}A ${c.cable})`).join(" · ")}
          </p>
        </div>
        <div className="grid grid-cols-3 text-[10px]" style={{ minWidth: "260px" }}>
          <div className="border-l border-bp-line px-2 py-1">
            <div className="text-bp-line-soft">DATE</div>
            <div className="bp-dim">{today}</div>
          </div>
          <div className="border-l border-bp-line px-2 py-1">
            <div className="text-bp-line-soft">JURISDICTION</div>
            <div className="bp-dim">Wake Co, NC</div>
          </div>
          <div className="border-l border-bp-line px-2 py-1">
            <div className="text-bp-line-soft">SHEET</div>
            <div className="bp-dim">E-101</div>
          </div>
        </div>
      </div>

      {output.warnings.length > 0 && (
        <div className="print-avoid-break mb-4 border border-bp-line-faint p-2">
          {output.warnings.map((w, i) => (
            <p key={i} className="bp-dim text-[10px]">
              {w.severity === "danger" ? "⚠⚠" : w.severity === "warn" ? "⚠" : "ⓘ"} {w.message}
            </p>
          ))}
        </div>
      )}

      {/* whole-circuit schematic */}
      <div className="print-avoid-break mb-4 border border-bp-line-faint p-2">
        <h2 className="bp-panel-title mb-1 text-sm">Circuit Schematic</h2>
        <CircuitSchematic model={output.schematic} />
      </div>

      {/* one wiring sheet per device */}
      {output.devicePlans.map((plan) => (
        <div key={plan.deviceId} className="print-avoid-break mb-4 border border-bp-line-faint p-3">
          <h2 className="bp-panel-title mb-2 text-sm">
            {plan.displayName} — {plan.configLabel}
          </h2>
          <div className="grid grid-cols-[3fr_2fr] gap-4">
            <PictorialBox plan={plan} activeStep={null} />
            <ol className="flex flex-col gap-1.5">
              {plan.connections.map((c) => (
                <li key={c.step} className="flex gap-2 text-[11px]">
                  <span className="bp-dim shrink-0 font-bold">{c.step + 1}.</span>
                  <span>{c.instruction}</span>
                </li>
              ))}
              {plan.notes.map((n, i) => (
                <li key={`n${i}`} className="bp-dim text-[10px] text-bp-line-soft">
                  ⚠ {n}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ))}

      {/* panel directory label */}
      <div className="print-avoid-break mb-4">
        <h2 className="bp-panel-title mb-2 text-sm">Panel Directory Label</h2>
        <PanelDirectoryLabel panel={input.panel} directory={output.panelDirectory} />
      </div>

      <div className="print-avoid-break mb-4">
        <h2 className="bp-panel-title mb-2 text-sm">Shopping List</h2>
        <ShoppingList lines={output.shopping} readOnly />
      </div>

      <div className="print-avoid-break mb-4">
        <h2 className="bp-panel-title mb-2 text-sm">Install Steps</h2>
        <ol className="flex flex-col gap-1.5">
          {output.tasks.map((t) => {
            const refs = (t.codeNoteIds ?? [])
              .map((id) => electricalCodeNote(id)?.ref)
              .filter(Boolean);
            return (
              <li key={t.seq} className="flex gap-2 text-[11px]">
                <span className="bp-dim shrink-0 font-bold">{t.seq + 1}.</span>
                <span>
                  <span className="font-medium">{t.title}.</span> {t.detail}
                  {refs.length > 0 && (
                    <span className="bp-dim text-bp-line-soft"> [{refs.join("; ")}]</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="bp-dim mt-4 text-[9px] text-bp-line-soft">
        NC homeowner exemption: DIY electrical on your own residence requires a permit and
        inspection (rough-in BEFORE cover). Verify the adopted NEC edition with Wake County
        Inspections. Generated by HomeReno · engine {output.engineVersion}
      </p>
    </div>
  );
}
