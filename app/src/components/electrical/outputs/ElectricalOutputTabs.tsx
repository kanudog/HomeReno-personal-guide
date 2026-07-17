"use client";

import { useState } from "react";
import type { ElectricalOutput } from "@/lib/modules/electrical/types";
import { ELECTRICAL_CODE_NOTES, electricalCodeNote } from "@/lib/modules/electrical/data/codeNotes";
import { formatIn3 } from "@/lib/modules/electrical/data/boxes";
import { ShoppingList } from "@/components/outputs/ShoppingList";
import { useElectrical } from "@/stores/electrical";
import { ROLE_LABELS, WIRE_COLORS, WIRENUT_COLORS } from "../palette";
import { LoadRows } from "../forms/ElectricalForm";

const TABS = [
  { id: "connections", label: "Connections" },
  { id: "steps", label: "Steps" },
  { id: "load", label: "Load & Advisor" },
  { id: "shopping", label: "Shopping" },
  { id: "code", label: "Code Notes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const KIND_COLOR: Record<string, string> = {
  info: "var(--bp-ok)",
  tip: "var(--bp-ok)",
  warn: "var(--bp-warn)",
  danger: "var(--bp-danger)",
  code: "var(--bp-accent)",
};

function PctBar({ pct, pass }: { pct: number; pass: boolean }) {
  return (
    <div className="h-2 w-full max-w-56 overflow-hidden rounded-full bg-bp-paper-raised">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, pct)}%`,
          backgroundColor: pass ? (pct > 80 ? "var(--bp-warn)" : "var(--bp-ok)") : "var(--bp-danger)",
        }}
      />
    </div>
  );
}

function ConnectionsTab({ output }: { output: ElectricalOutput }) {
  const selectDevice = useElectrical((s) => s.selectDevice);
  const setActiveStep = useElectrical((s) => s.setActiveStep);
  const selectedDeviceId = useElectrical((s) => s.selectedDeviceId);
  const activeStep = useElectrical((s) => s.activeStep);

  if (output.devicePlans.length === 0) {
    return <p className="bp-dim text-sm text-bp-line-soft">Add a device to a circuit to see its make-up plan.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {output.devicePlans.map((plan) => (
        <div key={plan.deviceId} className={`rounded-sm border p-3 ${selectedDeviceId === plan.deviceId ? "border-bp-accent" : "border-bp-line-faint"}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-medium text-bp-line">{plan.displayName}</p>
            <span className="bp-dim text-[11px] text-bp-line-soft">{plan.configLabel}</span>
            <span
              className={`bp-dim ml-auto rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                plan.boxFill.pass ? "border-bp-line-faint text-bp-line-soft" : "border-bp-danger text-bp-danger"
              }`}
            >
              {plan.boxFill.boxLabel} · {formatIn3(plan.boxFill.totalFill)} / {formatIn3(plan.boxFill.capacity)}
            </span>
          </div>

          <table className="w-full border-collapse text-sm">
            <tbody>
              {plan.connections.map((c) => {
                const active = selectedDeviceId === plan.deviceId && activeStep === c.step;
                return (
                  <tr
                    key={c.step}
                    onClick={() => {
                      selectDevice(plan.deviceId);
                      setActiveStep(active ? null : c.step);
                    }}
                    className={`cursor-pointer border-b border-bp-line-faint/40 transition-colors ${
                      active ? "bg-bp-paper-raised/60" : "hover:bg-bp-paper-raised/30"
                    }`}
                  >
                    <td className="bp-dim w-8 py-1.5 pr-2 text-bp-accent">{c.step + 1}</td>
                    <td className="w-32 py-1.5 pr-2">
                      <span className="flex flex-wrap gap-1">
                        {c.conductorIds.map((id) => {
                          const wire = plan.cables.flatMap((cb) => cb.conductors).find((w) => w.id === id);
                          if (!wire) return null;
                          const color = WIRE_COLORS[wire.reidentifiedTo ?? wire.color];
                          return (
                            <span
                              key={id}
                              title={`${wire.cableRole} ${wire.color} — ${ROLE_LABELS[wire.role]}`}
                              className="inline-block h-2 w-6 rounded-full"
                              style={{
                                backgroundColor: color.stroke,
                                boxShadow: color.halo ? `0 0 0 1.5px ${color.halo}` : undefined,
                              }}
                            />
                          );
                        })}
                        {c.target.kind === "prep" && <span className="bp-dim text-[10px] text-bp-line-soft">prep</span>}
                      </span>
                    </td>
                    <td className="py-1.5 text-[13px] text-bp-line-soft">{c.instruction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {plan.wirenuts.length > 0 && (
            <p className="bp-dim mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
              Wire nuts:
              {plan.wirenuts.map((n) => (
                <span key={n.id} className="flex items-center gap-1">
                  <span
                    className="inline-block h-3 w-3 rounded-[3px]"
                    style={{ backgroundColor: WIRENUT_COLORS[n.size] ?? "#9aa7b4" }}
                  />
                  {n.size}
                </span>
              ))}
            </p>
          )}
          {plan.notes.map((n, i) => (
            <p key={i} className="bp-dim mt-1.5 text-[11px] text-bp-warn">
              ⚠ {n}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function StepsTab({ output }: { output: ElectricalOutput }) {
  const selectDevice = useElectrical((s) => s.selectDevice);
  const setActiveStep = useElectrical((s) => s.setActiveStep);
  return (
    <ol className="flex flex-col gap-5">
      {output.tasks.map((t) => {
        const notes = (t.codeNoteIds ?? []).map((id) => electricalCodeNote(id)).filter(Boolean);
        return (
          <li key={t.seq} className="flex gap-3">
            <span className="bp-dim mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-bp-accent text-[12px] text-bp-accent">
              {t.seq + 1}
            </span>
            <div className="min-w-0 grow">
              <p className="font-medium text-bp-line">
                {t.title}
                {t.diagramRef && (
                  <button
                    onClick={() => {
                      selectDevice(t.diagramRef!.deviceId);
                      setActiveStep(0);
                    }}
                    className="bp-dim ml-2 rounded-sm border border-bp-line-faint px-2 py-0.5 text-[10px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
                  >
                    Show wiring ▸
                  </button>
                )}
              </p>
              <p className="mt-0.5 text-sm text-bp-line-soft">{t.detail}</p>
              {notes.map((n) => (
                <div
                  key={n!.id}
                  className="mt-2 rounded-sm border-l-4 bg-bp-paper-deep p-2.5"
                  style={{ borderLeftColor: KIND_COLOR[n!.kind] ?? "var(--bp-warn)" }}
                >
                  <p className="bp-dim text-[10px] uppercase tracking-widest" style={{ color: KIND_COLOR[n!.kind] }}>
                    {n!.title}
                    {n!.ref ? ` · ${n!.ref}` : ""}
                  </p>
                  <p className="mt-0.5 text-[12px] text-bp-line-soft">{n!.body}</p>
                </div>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LoadTab({ output }: { output: ElectricalOutput }) {
  const input = useElectrical((s) => s.input);
  const setAdvisor = useElectrical((s) => s.setAdvisor);
  const addAdvisorLoad = useElectrical((s) => s.addAdvisorLoad);
  const updateAdvisorLoad = useElectrical((s) => s.updateAdvisorLoad);
  const removeAdvisorLoad = useElectrical((s) => s.removeAdvisorLoad);
  const advisor = output.advisor;
  const ampsOptions = input.advisor?.breakerAmpsOptions ?? [15, 20];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
          Connected load per circuit (continuous loads counted at 125%)
        </p>
        <div className="flex flex-col gap-2">
          {output.circuitLoads.map((cl) => {
            const circuit = input.circuits.find((c) => c.id === cl.circuitId);
            return (
              <div key={cl.circuitId} className="flex flex-wrap items-center gap-3">
                <span className="w-44 truncate text-sm">{circuit?.name ?? cl.circuitId}</span>
                <PctBar pct={cl.pctOfCapacity} pass={cl.pass} />
                <span className={`bp-dim text-[12px] ${cl.pass ? "text-bp-line-soft" : "text-bp-danger"}`}>
                  {cl.adjustedVa} / {cl.capacityVa} VA ({cl.pctOfCapacity}%)
                  {cl.pass ? "" : " — over"}
                </span>
              </div>
            );
          })}
          {output.circuitLoads.length === 0 && (
            <p className="bp-dim text-sm text-bp-line-soft">No circuits yet.</p>
          )}
        </div>
      </div>

      <div>
        <p className="bp-dim mb-1 text-[10px] uppercase tracking-widest text-bp-accent">
          Capacity advisor — one breaker or two?
        </p>
        <p className="bp-dim mb-2 text-[11px] text-bp-line-soft">
          List everything that will run at once (your printers, lights, ventilation…) and compare
          circuit options side by side.
        </p>
        <LoadRows
          loads={input.advisor?.loads ?? []}
          onAdd={(preset) => addAdvisorLoad(preset)}
          onUpdate={(id, patch) => updateAdvisorLoad(id, patch)}
          onRemove={(id) => removeAdvisorLoad(id)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">Breakers:</span>
          {[15, 20, 30].map((a) => (
            <button
              key={a}
              onClick={() =>
                setAdvisor({
                  breakerAmpsOptions: ampsOptions.includes(a)
                    ? ampsOptions.filter((x) => x !== a)
                    : [...ampsOptions, a].sort((x, y) => x - y),
                })
              }
              className={`bp-dim rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest ${
                ampsOptions.includes(a)
                  ? "border-bp-accent text-bp-accent"
                  : "border-bp-line-faint text-bp-line-soft"
              }`}
            >
              {a}A
            </button>
          ))}
          <span className="bp-dim ml-2 text-[10px] uppercase tracking-widest text-bp-line-soft">Max circuits:</span>
          {[1, 2, 3].map((k) => (
            <button
              key={k}
              onClick={() => setAdvisor({ maxCircuits: k })}
              className={`bp-dim rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest ${
                (input.advisor?.maxCircuits ?? 2) === k
                  ? "border-bp-accent text-bp-accent"
                  : "border-bp-line-faint text-bp-line-soft"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {advisor && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {advisor.scenarios.map((s) => {
                const recommended = advisor.recommendedId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`rounded-sm border p-3 ${
                      recommended
                        ? "border-bp-accent bg-bp-paper-raised/40"
                        : s.pass
                          ? "border-bp-line-faint"
                          : "border-bp-line-faint opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{s.title}</p>
                      <span
                        className={`bp-dim rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${
                          recommended
                            ? "bg-bp-accent text-bp-paper-deep"
                            : s.pass
                              ? "border border-bp-ok text-bp-ok"
                              : "border border-bp-danger text-bp-danger"
                        }`}
                      >
                        {recommended ? "Recommended" : s.pass ? "Works" : "Overloaded"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      {s.circuits.map((c, i) => (
                        <div key={i}>
                          <p className="bp-dim text-[10px] text-bp-line-soft">
                            Circuit {i + 1} · {c.breakerAmps}A / {c.minAwg} AWG — {c.assignedSummary}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <PctBar pct={c.pctOfCapacity} pass={c.pass} />
                            <span className={`bp-dim text-[11px] ${c.pass ? "text-bp-line-soft" : "text-bp-danger"}`}>
                              {c.pctOfCapacity}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {advisor.notes.map((n, i) => (
                <li key={i} className="bp-dim text-[11px] text-bp-line-soft">
                  • {n}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export function ElectricalOutputTabs({ output }: { output: ElectricalOutput }) {
  const [tab, setTab] = useState<TabId>("connections");

  return (
    <section className="bp-panel p-4">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-bp-line-faint pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bp-dim rounded-sm px-3 py-2 text-[11px] uppercase tracking-widest transition-colors ${
              tab === t.id ? "bg-bp-accent text-bp-paper-deep" : "text-bp-line-soft hover:text-bp-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "connections" && <ConnectionsTab output={output} />}
      {tab === "steps" && <StepsTab output={output} />}
      {tab === "load" && <LoadTab output={output} />}
      {tab === "shopping" && <ShoppingList lines={output.shopping} />}
      {tab === "code" && (
        <div className="flex flex-col gap-3">
          {ELECTRICAL_CODE_NOTES.map((n) => (
            <div
              key={n.id}
              className="rounded-sm border-l-4 bg-bp-paper-deep p-3"
              style={{ borderLeftColor: KIND_COLOR[n.kind] ?? "var(--bp-warn)" }}
            >
              <p className="bp-dim text-[10px] uppercase tracking-widest" style={{ color: KIND_COLOR[n.kind] }}>
                {n.title}
                {n.ref ? ` · ${n.ref}` : ""}
              </p>
              <p className="mt-1 text-[13px] text-bp-line-soft">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
