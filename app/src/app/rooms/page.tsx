"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { computeRoom } from "@/lib/modules/framing/room";
import type { PlanDir } from "@/lib/modules/framing/room";
import type { Sixteenths } from "@/lib/units";
import { useRoom } from "@/stores/room";
import { useSettings } from "@/stores/settings";
import { UnitToggle } from "@/components/ui/UnitToggle";
import { TapeMeasureInput } from "@/components/measure/TapeMeasureInput";
import { RoomPlanCanvas } from "@/components/plan/RoomPlanCanvas";
import { WallElevation } from "@/components/svg/WallElevation";
import { WallForm } from "@/components/forms/WallForm";
import { CornerDetail } from "@/components/svg/CornerDetail";
import { CutListTable } from "@/components/outputs/CutListTable";
import { PackingDiagram } from "@/components/outputs/PackingDiagram";
import { ShoppingList } from "@/components/outputs/ShoppingList";

const RoomScene = dynamic(() => import("@/components/three/RoomScene").then((m) => m.RoomScene), {
  ssr: false,
  loading: () => <p className="p-6 text-bp-line-soft">Loading 3D…</p>,
});

const OUT_TABS = ["Cut List", "Cut Plan", "Shopping"] as const;

export default function RoomsPage() {
  const plan = useRoom((s) => s.plan);
  const selectedWallId = useRoom((s) => s.selectedWallId);
  const select = useRoom((s) => s.select);
  const addWall = useRoom((s) => s.addWall);
  const updateWall = useRoom((s) => s.updateWall);
  const updateTemplate = useRoom((s) => s.updateTemplate);
  const removeWall = useRoom((s) => s.removeWall);
  const setClosed = useRoom((s) => s.setClosed);
  const setCornerStyle = useRoom((s) => s.setCornerStyle);
  const addOpening = useRoom((s) => s.addOpening);
  const updateOpening = useRoom((s) => s.updateOpening);
  const removeOpening = useRoom((s) => s.removeOpening);
  const system = useSettings((s) => s.system);

  const [show3D, setShow3D] = useState(false);
  const [outTab, setOutTab] = useState<(typeof OUT_TABS)[number]>("Cut List");

  const room = useMemo(() => computeRoom(plan), [plan]);
  const selected = room.walls.find((w) => w.plan.id === selectedWallId) ?? room.walls[0];

  return (
    <main className="mx-auto w-full max-w-7xl grow px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
          >
            ← HomeReno
          </Link>
          <h1 className="bp-panel-title text-xl">Room Planner</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Corners
            </span>
            <select
              value={plan.cornerStyle}
              onChange={(e) => setCornerStyle(e.target.value as "california" | "double")}
              className="bp-dim h-9 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none"
            >
              <option value="california">California</option>
              <option value="double">Double stud</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={plan.closed}
              onChange={(e) => setClosed(e.target.checked)}
              className="h-4 w-4 accent-[var(--bp-accent)]"
            />
            <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
              Closed room
            </span>
          </label>
          <button
            onClick={() => setShow3D((v) => !v)}
            className={`bp-dim rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
              show3D ? "border-bp-ok text-bp-ok" : "border-bp-line-faint text-bp-line-soft"
            }`}
          >
            3D
          </button>
          <UnitToggle />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <section className="bp-panel p-3">
          {show3D ? (
            <RoomScene room={room} selectedWallId={selected?.plan.id ?? null} onSelectWall={select} />
          ) : (
            <RoomPlanCanvas
              room={room}
              selectedWallId={selected?.plan.id ?? null}
              onSelect={select}
              system={system}
            />
          )}
          {room.warnings.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {room.warnings.map((w, i) => (
                <li key={i} className="text-sm text-bp-warn">
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bp-panel flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="bp-panel-title text-sm">Walls</h2>
            <button
              onClick={addWall}
              className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors hover:bg-bp-accent hover:text-bp-paper-deep"
            >
              + Wall
            </button>
          </div>
          {plan.walls.map((w) => (
            <div
              key={w.id}
              onClick={() => select(w.id)}
              className={`flex flex-wrap items-end gap-2 rounded-sm border p-2 ${
                selected?.plan.id === w.id ? "border-bp-accent" : "border-bp-line-faint"
              }`}
            >
              <span className="bp-dim w-14 text-[11px] uppercase tracking-widest text-bp-line">
                {w.name}
              </span>
              <label className="flex flex-col gap-0.5">
                <span className="bp-dim text-[9px] uppercase tracking-widest text-bp-line-soft">
                  Runs
                </span>
                <select
                  value={w.dir}
                  onChange={(e) => updateWall(w.id, { dir: e.target.value as PlanDir })}
                  className="bp-dim h-9 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-1.5 text-sm text-bp-line outline-none"
                >
                  <option value="E">East →</option>
                  <option value="S">South ↓</option>
                  <option value="W">West ←</option>
                  <option value="N">North ↑</option>
                </select>
              </label>
              <TapeMeasureInput
                compact
                label="Length"
                value={w.length}
                onChange={(v) => updateWall(w.id, { length: v })}
                system={system}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeWall(w.id);
                }}
                className="bp-dim mb-1 text-[10px] uppercase tracking-widest text-bp-danger hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <p className="bp-dim text-[10px] text-bp-line-soft">
            Walls chain end-to-end. At each 90° corner the earlier wall runs through (and gets
            corner studs); the next wall is automatically shortened by the wall depth and butts in.
          </p>
          <CornerDetail style={plan.cornerStyle} />
        </section>
      </div>

      {selected && (
        <section className="bp-panel mt-6 overflow-hidden p-3">
          <h2 className="bp-panel-title mb-2 text-sm">
            {selected.plan.name} — elevation (framed length auto-adjusted for corners)
          </h2>
          <WallElevation layout={selected.output.layout} system={system} showIds className="h-auto w-full" />
          <div className="mt-4">
            <WallForm
              wall={selected.input}
              layout={selected.output.layout}
              system={system}
              onWall={(patch) => {
                if (patch.length !== undefined) {
                  updateWall(selected.plan.id, { length: patch.length as Sixteenths });
                }
                const { length: _len, corners: _c, openings: _o, ...rest } = patch;
                if (Object.keys(rest).length > 0) updateTemplate(selected.plan.id, rest);
              }}
              onOpening={(id, patch) => updateOpening(selected.plan.id, id, patch)}
              onAddOpening={(kind) => addOpening(selected.plan.id, kind)}
              onRemoveOpening={(id) => removeOpening(selected.plan.id, id)}
            />
          </div>
        </section>
      )}

      <section className="bp-panel mt-6 p-4">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-bp-line-faint pb-3">
          {OUT_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setOutTab(t)}
              className={`bp-dim rounded-sm px-3 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                outTab === t ? "bg-bp-accent text-bp-paper-deep" : "text-bp-line-soft hover:text-bp-line"
              }`}
            >
              {t} (whole room)
            </button>
          ))}
        </div>
        {outTab === "Cut List" && <CutListTable cutList={room.combined.cutList} system={system} />}
        {outTab === "Cut Plan" && <PackingDiagram packing={room.combined.packing} system={system} />}
        {outTab === "Shopping" && <ShoppingList lines={room.combined.shopping} />}
      </section>
    </main>
  );
}
