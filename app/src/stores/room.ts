"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { inches } from "@/lib/units";
import type { OpeningInput, WallInput } from "@/lib/modules/framing/types";
import type { PlanDir, PlanWall, RoomPlan } from "@/lib/modules/framing/room";

const DEFAULT_TEMPLATE: Omit<WallInput, "length" | "corners" | "openings"> = {
  height: inches(97.125),
  studSize: "2x4",
  spacingOC: inches(16),
  topPlate: "double",
  loadBearing: false,
  bottomPlatePT: true,
};

const NEXT_DIR: Record<PlanDir, PlanDir> = { E: "S", S: "W", W: "N", N: "E" };

interface RoomState {
  plan: RoomPlan;
  selectedWallId: string | null;
  addWall: () => void;
  updateWall: (id: string, patch: Partial<Pick<PlanWall, "dir" | "length" | "name">>) => void;
  updateTemplate: (id: string, patch: Partial<PlanWall["template"]>) => void;
  removeWall: (id: string) => void;
  setClosed: (closed: boolean) => void;
  setCornerStyle: (s: RoomPlan["cornerStyle"]) => void;
  select: (id: string | null) => void;
  addOpening: (wallId: string, kind: OpeningInput["kind"]) => void;
  updateOpening: (wallId: string, id: string, patch: Partial<OpeningInput>) => void;
  removeOpening: (wallId: string, id: string) => void;
}

let wallCounter = 2;
let openingCounter = 0;

export const useRoom = create<RoomState>()(
  persist(
    (set) => ({
      plan: {
        walls: [
          { id: "wall-a", name: "Wall A", dir: "E", length: inches(120), template: DEFAULT_TEMPLATE, openings: [] },
          { id: "wall-b", name: "Wall B", dir: "S", length: inches(96), template: DEFAULT_TEMPLATE, openings: [] },
        ],
        closed: false,
        cornerStyle: "california",
      },
      selectedWallId: "wall-a",
      addWall: () =>
        set((s) => {
          wallCounter += 1;
          const name = `Wall ${String.fromCharCode(64 + wallCounter)}`;
          const last = s.plan.walls[s.plan.walls.length - 1];
          const wall: PlanWall = {
            id: `wall-${wallCounter}-${s.plan.walls.length}`,
            name,
            dir: last ? NEXT_DIR[last.dir] : "E",
            length: inches(96),
            template: last?.template ?? DEFAULT_TEMPLATE,
            openings: [],
          };
          return { plan: { ...s.plan, walls: [...s.plan.walls, wall] }, selectedWallId: wall.id };
        }),
      updateWall: (id, patch) =>
        set((s) => ({
          plan: {
            ...s.plan,
            walls: s.plan.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
          },
        })),
      updateTemplate: (id, patch) =>
        set((s) => ({
          plan: {
            ...s.plan,
            walls: s.plan.walls.map((w) =>
              w.id === id ? { ...w, template: { ...w.template, ...patch } } : w,
            ),
          },
        })),
      removeWall: (id) =>
        set((s) => ({
          plan: { ...s.plan, walls: s.plan.walls.filter((w) => w.id !== id) },
          selectedWallId: s.selectedWallId === id ? null : s.selectedWallId,
        })),
      setClosed: (closed) => set((s) => ({ plan: { ...s.plan, closed } })),
      setCornerStyle: (cornerStyle) => set((s) => ({ plan: { ...s.plan, cornerStyle } })),
      select: (selectedWallId) => set({ selectedWallId }),
      addOpening: (wallId, kind) =>
        set((s) => {
          openingCounter += 1;
          const id = `ro-${openingCounter}-${wallId}`;
          const opening: OpeningInput =
            kind === "door"
              ? { id, kind, offset: inches(12), unitWidth: inches(32), unitHeight: inches(80) }
              : {
                  id,
                  kind,
                  offset: inches(12),
                  unitWidth: inches(36),
                  unitHeight: inches(48),
                  sillHeight: inches(36),
                };
          return {
            plan: {
              ...s.plan,
              walls: s.plan.walls.map((w) =>
                w.id === wallId ? { ...w, openings: [...w.openings, opening] } : w,
              ),
            },
          };
        }),
      updateOpening: (wallId, id, patch) =>
        set((s) => ({
          plan: {
            ...s.plan,
            walls: s.plan.walls.map((w) =>
              w.id === wallId
                ? { ...w, openings: w.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) }
                : w,
            ),
          },
        })),
      removeOpening: (wallId, id) =>
        set((s) => ({
          plan: {
            ...s.plan,
            walls: s.plan.walls.map((w) =>
              w.id === wallId ? { ...w, openings: w.openings.filter((o) => o.id !== id) } : w,
            ),
          },
        })),
    }),
    { name: "homereno-room" },
  ),
);
