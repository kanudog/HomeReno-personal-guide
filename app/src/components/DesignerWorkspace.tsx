"use client";

import Link from "next/link";
import { useMemo } from "react";
import { computeFraming } from "@/lib/modules/framing";
import { WallCanvas } from "@/components/canvas/WallCanvas";
import { WallForm } from "@/components/forms/WallForm";
import { OutputTabs } from "@/components/outputs/OutputTabs";
import { UnitToggle } from "@/components/ui/UnitToggle";
import { useEditor } from "@/stores/editor";
import { useSettings } from "@/stores/settings";

export interface DesignerWorkspaceProps {
  title: string;
  backHref: string;
  backLabel: string;
  /** Extra header content (save status, rename field). */
  headerExtra?: React.ReactNode;
}

export function DesignerWorkspace({
  title,
  backHref,
  backLabel,
  headerExtra,
}: DesignerWorkspaceProps) {
  const wall = useEditor((s) => s.wall);
  const setWall = useEditor((s) => s.setWall);
  const addOpening = useEditor((s) => s.addOpening);
  const updateOpening = useEditor((s) => s.updateOpening);
  const removeOpening = useEditor((s) => s.removeOpening);
  const select = useEditor((s) => s.select);
  const selectedOpeningId = useEditor((s) => s.selectedOpeningId);
  const system = useSettings((s) => s.system);

  const output = useMemo(() => {
    try {
      return computeFraming(wall);
    } catch {
      return null;
    }
  }, [wall]);

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
            href="/design/3d"
            className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft transition-colors hover:border-bp-accent hover:text-bp-accent"
          >
            3D View
          </Link>
          <Link
            href="/design/print"
            className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors hover:bg-bp-accent hover:text-bp-paper-deep"
          >
            Print Cut Sheet
          </Link>
          <UnitToggle />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <section className="bp-panel overflow-hidden p-3">
          <WallCanvas system={system} />
        </section>

        <div>
          {output && (
            <WallForm
              wall={wall}
              layout={output.layout}
              system={system}
              onWall={setWall}
              onOpening={updateOpening}
              onAddOpening={addOpening}
              onRemoveOpening={removeOpening}
              selectedOpeningId={selectedOpeningId}
              onSelect={select}
            />
          )}
        </div>
      </div>

      {output && (
        <div className="mt-6">
          <OutputTabs output={output} system={system} />
        </div>
      )}
    </main>
  );
}
