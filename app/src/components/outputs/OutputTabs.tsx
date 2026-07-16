"use client";

import { useState } from "react";
import type { FramingOutput } from "@/lib/modules/framing/types";
import type { UnitSystem } from "@/lib/units";
import { FRAMING_TOOLS } from "@/lib/modules/framing/data/tools";
import { CODE_NOTES } from "@/lib/modules/framing/data/codeNotes";
import { CutListTable } from "./CutListTable";
import { PackingDiagram } from "./PackingDiagram";
import { NailingScheduleTable } from "./NailingScheduleTable";
import { ShoppingList } from "./ShoppingList";
import { CodeNotes } from "./CodeNotes";
import { PieceLegend } from "@/components/svg/PieceLegend";
import { PlateLayoutDiagram } from "@/components/svg/PlateLayoutDiagram";

const TABS = [
  { id: "cuts", label: "Cut List" },
  { id: "layout", label: "Plate Layout" },
  { id: "plan", label: "Cut Plan" },
  { id: "shopping", label: "Shopping" },
  { id: "nailing", label: "Nailing" },
  { id: "steps", label: "Steps" },
  { id: "tools", label: "Tools" },
  { id: "code", label: "Code Notes" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Illustrations generated for the repeatable steps (see /public/steps). */
const STEP_IMAGES: Record<number, string> = {
  0: "/steps/step-plates.jpg",
  1: "/steps/step-studs.jpg",
  2: "/steps/step-jacks.jpg",
  3: "/steps/step-header.jpg",
  4: "/steps/step-cripples.jpg",
  5: "/steps/step-sill.jpg",
  6: "/steps/step-blocking.jpg",
  7: "/steps/step-raise.jpg",
};

export function OutputTabs({ output, system }: { output: FramingOutput; system: UnitSystem }) {
  const [tab, setTab] = useState<TabId>("cuts");
  const [plateSide, setPlateSide] = useState<"bottom" | "top">("bottom");

  return (
    <section className="bp-panel p-4">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-bp-line-faint pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bp-dim rounded-sm px-3 py-2 text-[11px] uppercase tracking-widest transition-colors ${
              tab === t.id
                ? "bg-bp-accent text-bp-paper-deep"
                : "text-bp-line-soft hover:text-bp-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cuts" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
          <CutListTable cutList={output.cutList} system={system} />
          <div>
            <p className="bp-dim mb-2 text-[10px] uppercase tracking-widest text-bp-line-soft">
              Which piece is which
            </p>
            <PieceLegend />
          </div>
        </div>
      )}

      {tab === "layout" && (
        <div>
          <div className="mb-3 flex gap-2">
            {(["bottom", "top"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPlateSide(s)}
                className={`bp-dim rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
                  plateSide === s
                    ? "border-bp-accent text-bp-accent"
                    : "border-bp-line-faint text-bp-line-soft"
                }`}
              >
                {s} plate
              </button>
            ))}
          </div>
          <PlateLayoutDiagram layout={output.layout} plate={plateSide} system={system} />
          <p className="bp-dim mt-2 text-[10px] text-bp-line-soft">
            Distances are clear spans between member edges — hook your tape on the plate end and
            mark each line, then an X on the side the member stands on.
          </p>
        </div>
      )}

      {tab === "plan" && <PackingDiagram packing={output.packing} system={system} />}
      {tab === "shopping" && <ShoppingList lines={output.shopping} />}
      {tab === "nailing" && <NailingScheduleTable nailing={output.nailing} />}

      {tab === "steps" && (
        <ol className="flex flex-col gap-5">
          {output.tasks.map((t) => {
            const notes = (t.codeNoteIds ?? [])
              .map((id) => CODE_NOTES.find((n) => n.id === id))
              .filter(Boolean);
            const img = t.assemblyStep !== null ? STEP_IMAGES[t.assemblyStep] : undefined;
            return (
              <li key={t.seq} className="flex gap-3">
                <span className="bp-dim mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-bp-accent text-[12px] text-bp-accent">
                  {t.seq + 1}
                </span>
                <div className="min-w-0 grow">
                  <p className="font-medium text-bp-line">{t.title}</p>
                  <p className="mt-0.5 text-sm text-bp-line-soft">{t.detail}</p>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element -- static illustration
                    <img
                      src={img}
                      alt={`Illustration: ${t.title}`}
                      className="mt-3 w-full max-w-md rounded-sm border border-bp-line-faint"
                      loading="lazy"
                    />
                  )}
                  {notes.map((n) => (
                    <div
                      key={n!.id}
                      className="mt-2 rounded-sm border-l-4 bg-bp-paper-deep p-2.5"
                      style={{ borderLeftColor: "var(--bp-warn)" }}
                    >
                      <p className="bp-dim text-[10px] uppercase tracking-widest text-bp-warn">
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
      )}

      {tab === "tools" && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FRAMING_TOOLS.map((t) => (
            <li key={t.name} className="flex items-start gap-2 text-sm">
              <span className="bp-dim text-bp-accent">☐</span>
              <span>
                {t.name}
                {t.essential ? "" : " (nice to have)"}
                {t.detail && <span className="text-bp-line-soft"> — {t.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {tab === "code" && <CodeNotes />}
    </section>
  );
}
