"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UnitSystem } from "@/lib/units";

interface SettingsState {
  system: UnitSystem;
  jurisdiction: string;
  setSystem: (s: UnitSystem) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      system: "imperial",
      jurisdiction: "us-nc-wake",
      setSystem: (system) => set({ system }),
    }),
    { name: "homereno-settings" },
  ),
);
