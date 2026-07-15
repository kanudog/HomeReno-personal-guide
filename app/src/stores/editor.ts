"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { temporal } from "zundo";
import { inches } from "@/lib/units";
import type { OpeningInput, WallInput } from "@/lib/modules/framing/types";

interface EditorState {
  wall: WallInput;
  selectedOpeningId: string | null;
  /** Supabase design row this editor is bound to (null = scratch /design). */
  boundDesignId: string | null;
  /** User-corrected unit prices (cents) keyed by shopping-line id. */
  costOverrides: Record<string, number>;
  setWall: (patch: Partial<WallInput>) => void;
  replaceWall: (wall: WallInput) => void;
  bindDesign: (designId: string | null, wall?: WallInput) => void;
  addOpening: (kind: OpeningInput["kind"]) => void;
  updateOpening: (id: string, patch: Partial<OpeningInput>) => void;
  removeOpening: (id: string) => void;
  select: (id: string | null) => void;
  setCostOverride: (id: string, cents: number) => void;
}

const DEFAULT_WALL: WallInput = {
  length: inches(144),
  height: inches(97.125),
  studSize: "2x4",
  spacingOC: inches(16),
  topPlate: "double",
  loadBearing: true,
    bottomPlatePT: true,
  openings: [
    {
      id: "opening-1",
      kind: "window",
      offset: inches(60),
      unitWidth: inches(36),
      unitHeight: inches(48),
      sillHeight: inches(36),
    },
  ],
};

let openingCounter = 1;

export const useEditor = create<EditorState>()(
  persist(
    temporal(
      (set) => ({
        wall: DEFAULT_WALL,
        selectedOpeningId: null,
        boundDesignId: null,
        costOverrides: {},
        setWall: (patch) => set((s) => ({ wall: { ...s.wall, ...patch } })),
        replaceWall: (wall) => set({ wall, selectedOpeningId: null }),
        bindDesign: (boundDesignId, wall) =>
          set((s) => ({
            boundDesignId,
            wall: wall ?? s.wall,
            selectedOpeningId: null,
          })),
        addOpening: (kind) =>
          set((s) => {
            openingCounter += 1;
            const id = `opening-${openingCounter}-${s.wall.openings.length + 1}`;
            const opening: OpeningInput =
              kind === "door"
                ? {
                    id,
                    kind,
                    offset: inches(12),
                    unitWidth: inches(32),
                    unitHeight: inches(80),
                  }
                : {
                    id,
                    kind,
                    offset: inches(12),
                    unitWidth: inches(36),
                    unitHeight: inches(48),
                    sillHeight: inches(36),
                  };
            return {
              wall: { ...s.wall, openings: [...s.wall.openings, opening] },
              selectedOpeningId: id,
            };
          }),
        updateOpening: (id, patch) =>
          set((s) => ({
            wall: {
              ...s.wall,
              openings: s.wall.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
            },
          })),
        removeOpening: (id) =>
          set((s) => ({
            wall: { ...s.wall, openings: s.wall.openings.filter((o) => o.id !== id) },
            selectedOpeningId: s.selectedOpeningId === id ? null : s.selectedOpeningId,
          })),
        select: (selectedOpeningId) => set({ selectedOpeningId }),
        setCostOverride: (id, cents) =>
          set((s) => ({ costOverrides: { ...s.costOverrides, [id]: cents } })),
      }),
      {
        // undo history: only track the wall, and only on committed changes
        partialize: (state) => ({ wall: state.wall }),
        limit: 100,
      },
    ),
    {
      name: "homereno-design",
      partialize: (s) => ({ wall: s.wall, costOverrides: s.costOverrides }),
    },
  ),
);

export const useEditorTemporal = () => useEditor.temporal;
