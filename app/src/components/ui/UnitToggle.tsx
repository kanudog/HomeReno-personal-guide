"use client";

import { useSettings } from "@/stores/settings";

export function UnitToggle() {
  const system = useSettings((s) => s.system);
  const setSystem = useSettings((s) => s.setSystem);
  return (
    <div className="flex overflow-hidden rounded-sm border border-bp-line-faint">
      <button
        onClick={() => setSystem("imperial")}
        className={`bp-dim px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
          system === "imperial"
            ? "bg-bp-accent text-bp-paper-deep"
            : "text-bp-line-soft hover:text-bp-line"
        }`}
      >
        ft / in
      </button>
      <button
        onClick={() => setSystem("metric")}
        className={`bp-dim px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
          system === "metric"
            ? "bg-bp-accent text-bp-paper-deep"
            : "text-bp-line-soft hover:text-bp-line"
        }`}
      >
        mm
      </button>
    </div>
  );
}
