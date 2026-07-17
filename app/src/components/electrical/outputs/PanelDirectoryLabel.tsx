import type { ElectricalInput, PanelDirectoryEntry } from "@/lib/modules/electrical/types";

/**
 * Printable panel directory sized for a panel door: odd slots left column,
 * even slots right (matching a real load center). New circuits from this
 * design print bold.
 */
export function PanelDirectoryLabel({
  panel,
  directory,
}: {
  panel: ElectricalInput["panel"];
  directory: PanelDirectoryEntry[];
}) {
  const bySlot = new Map<number, PanelDirectoryEntry>();
  for (const e of directory) {
    bySlot.set(e.slot, e);
    if (e.poles === 2) bySlot.set(e.slot + 2, { ...e, slot: e.slot + 2 });
  }

  const rows = Math.ceil(panel.slots / 2);
  const cell = (slot: number) => {
    const e = slot <= panel.slots ? bySlot.get(slot) : undefined;
    return (
      <div className="flex min-h-6 items-center gap-1.5 border-b border-bp-line-faint px-1.5 py-0.5">
        <span className="bp-dim w-5 shrink-0 text-[9px] text-bp-line-soft">{slot}</span>
        {e ? (
          <>
            <span className={`grow truncate text-[10px] ${e.isNew ? "font-bold text-bp-accent" : ""}`}>
              {e.label}
              {e.poles === 2 && e.slot !== slot ? " (2-pole)" : ""}
            </span>
            <span className="bp-dim shrink-0 text-[9px] text-bp-line-soft">{e.amps}A</span>
          </>
        ) : (
          <span className="bp-dim text-[9px] text-bp-line-faint">—</span>
        )}
      </div>
    );
  };

  return (
    <div className="inline-block border-2 border-bp-line" style={{ width: "5.5in" }}>
      <div className="border-b-2 border-bp-line px-2 py-1 text-center">
        <p className="bp-panel-title text-[11px]">{panel.label}</p>
        <p className="bp-dim text-[9px] text-bp-line-soft">
          {panel.mainAmps}A main · {panel.slots} spaces · updated {"____ /____ /____"}
        </p>
      </div>
      <div className="grid grid-cols-2">
        <div className="border-r border-bp-line">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i}>{cell(i * 2 + 1)}</div>
          ))}
        </div>
        <div>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i}>{cell(i * 2 + 2)}</div>
          ))}
        </div>
      </div>
      <p className="bp-dim px-2 py-1 text-center text-[8px] text-bp-line-soft">
        Cut on the outer border · tape inside the panel door · bold = added by this design
      </p>
    </div>
  );
}
