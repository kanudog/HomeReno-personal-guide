"use client";

import Link from "next/link";
import { useMemo } from "react";
import { computeElectrical } from "@/lib/modules/electrical";
import { computeFraming } from "@/lib/modules/framing";
import { inches, type Sixteenths } from "@/lib/units";
import { PictorialBox } from "./svg/PictorialBox";
import { CircuitSchematic } from "./svg/CircuitSchematic";
import { ElectricalForm } from "./forms/ElectricalForm";
import { ElectricalOutputTabs } from "./outputs/ElectricalOutputTabs";
import { WallElevation } from "@/components/svg/WallElevation";
import { UnitToggle } from "@/components/ui/UnitToggle";
import { SEVERITY_COLORS } from "./palette";
import { useElectrical } from "@/stores/electrical";
import { useEditor } from "@/stores/editor";
import { useSettings } from "@/stores/settings";

export interface ElectricalWorkspaceProps {
  title: string;
  backHref: string;
  backLabel: string;
  headerExtra?: React.ReactNode;
}

export function ElectricalWorkspace({
  title,
  backHref,
  backLabel,
  headerExtra,
}: ElectricalWorkspaceProps) {
  const input = useElectrical((s) => s.input);
  const selectedDeviceId = useElectrical((s) => s.selectedDeviceId);
  const selectDevice = useElectrical((s) => s.selectDevice);
  const activeStep = useElectrical((s) => s.activeStep);
  const setActiveStep = useElectrical((s) => s.setActiveStep);
  const system = useSettings((s) => s.system);
  const framedWall = useEditor((s) => s.wall);

  const output = useMemo(() => {
    try {
      return computeElectrical(input);
    } catch {
      return null;
    }
  }, [input]);

  const plan =
    output?.devicePlans.find((p) => p.deviceId === selectedDeviceId) ?? output?.devicePlans[0];
  const stepCount = plan?.connections.length ?? 0;

  // minimal wall-marker integration: devices flagged onto the scratch framed wall
  const markedDevices = input.circuits.flatMap((c) =>
    c.devices.filter((d) => d.wallDesignId !== undefined),
  );
  const framedLayout = useMemo(() => {
    if (markedDevices.length === 0) return null;
    try {
      return computeFraming(framedWall).layout;
    } catch {
      return null;
    }
  }, [markedDevices.length, framedWall]);

  return (
    <main className="mx-auto w-full max-w-7xl grow px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
          >
            ← {backLabel}
          </Link>
          <h1 className="bp-panel-title text-xl">{title}</h1>
          {headerExtra}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/electrical/troubleshoot"
            className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors hover:border-bp-accent hover:text-bp-accent"
          >
            Troubleshoot
          </Link>
          <Link
            href="/electrical/print"
            className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors hover:bg-bp-accent hover:text-bp-paper-deep"
          >
            Print Circuit Sheet
          </Link>
          <UnitToggle />
        </div>
      </header>

      {output && output.warnings.length > 0 && (
        <div className="bp-panel mb-5 flex flex-col gap-1.5 p-3">
          {output.warnings.map((w, i) => (
            <p key={i} className="bp-dim flex items-start gap-2 text-[12px]">
              <span
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[w.severity] }}
              />
              <span style={{ color: w.severity === "info" ? "var(--bp-line-soft)" : SEVERITY_COLORS[w.severity] }}>
                {w.message}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <div className="flex flex-col gap-6">
          <section className="bp-panel p-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {output?.devicePlans.map((p) => (
                <button
                  key={p.deviceId}
                  onClick={() => selectDevice(p.deviceId)}
                  className={`bp-dim rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors ${
                    plan?.deviceId === p.deviceId
                      ? "border-bp-accent text-bp-accent"
                      : "border-bp-line-faint text-bp-line-soft hover:text-bp-line"
                  }`}
                >
                  {p.displayName}
                </button>
              ))}
              {plan && stepCount > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setActiveStep(
                        activeStep === null ? 0 : Math.max(0, activeStep - 1),
                      )
                    }
                    className="bp-dim rounded-sm border border-bp-line-faint px-2 py-1 text-[10px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
                  >
                    ◀
                  </button>
                  <span className="bp-dim w-20 text-center text-[10px] uppercase tracking-widest text-bp-line-soft">
                    {activeStep === null ? "All steps" : `Step ${activeStep + 1}/${stepCount}`}
                  </span>
                  <button
                    onClick={() =>
                      setActiveStep(
                        activeStep === null ? 0 : Math.min(stepCount - 1, activeStep + 1),
                      )
                    }
                    className="bp-dim rounded-sm border border-bp-line-faint px-2 py-1 text-[10px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => setActiveStep(null)}
                    className="bp-dim rounded-sm border border-bp-line-faint px-2 py-1 text-[10px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
                  >
                    All
                  </button>
                </span>
              )}
            </div>
            {plan ? (
              <>
                <PictorialBox plan={plan} activeStep={activeStep} />
                {activeStep !== null && plan.connections[activeStep] && (
                  <p className="bp-dim mt-2 rounded-sm border-l-4 border-bp-accent bg-bp-paper-deep p-2.5 text-[12px] text-bp-line">
                    {activeStep + 1}. {plan.connections[activeStep]!.instruction}
                  </p>
                )}
              </>
            ) : (
              <p className="bp-dim p-6 text-sm text-bp-line-soft">
                Add a device to a circuit — its terminal-by-terminal wiring diagram appears here.
              </p>
            )}
          </section>

          {output && (
            <section className="bp-panel p-3">
              <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
                Circuit schematic — panel to end of run
              </p>
              <CircuitSchematic
                model={output.schematic}
                selectedDeviceId={plan?.deviceId ?? null}
                onSelectDevice={selectDevice}
              />
            </section>
          )}

          {framedLayout && (
            <section className="bp-panel p-3">
              <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
                Box positions on the framed wall (from the Framing designer)
              </p>
              <WallElevation
                layout={framedLayout}
                system={system}
                markers={markedDevices.map((d) => {
                  const dp = output?.devicePlans.find((p) => p.deviceId === d.id);
                  return {
                    x: (d.xOnWall ?? inches(24)) as Sixteenths,
                    y: (d.heightAFF ?? inches(12)) as Sixteenths,
                    w: inches(2.25),
                    h: inches(3.75),
                    label: dp?.displayName ?? "Box",
                  };
                })}
              />
            </section>
          )}
        </div>

        <ElectricalForm system={system} />
      </div>

      {output && (
        <div className="mt-6">
          <ElectricalOutputTabs output={output} />
        </div>
      )}
    </main>
  );
}
