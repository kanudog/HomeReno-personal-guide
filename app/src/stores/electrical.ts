"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { feet, inches } from "@/lib/units";
import type {
  AdvisorInput,
  ApplianceLoad,
  CircuitInput,
  DeviceInput,
  ElectricalInput,
  PanelInput,
  RoomFacts,
} from "@/lib/modules/electrical/types";
import { deviceSpec } from "@/lib/modules/electrical/data/devices";

/**
 * Electrical designer store. Mirrors the framing editor store: one input
 * object, scratch persistence in localStorage, optional binding to a
 * Supabase design row.
 */
interface ElectricalEditorState {
  input: ElectricalInput;
  boundDesignId: string | null;
  selectedDeviceId: string | null;
  /** Connection step highlighted in the pictorial diagram (null = show all). */
  activeStep: number | null;
  costOverrides: Record<string, number>;
  replaceInput: (input: ElectricalInput) => void;
  bindDesign: (designId: string | null, input?: ElectricalInput) => void;
  setPanel: (patch: Partial<PanelInput>) => void;
  addRoom: () => void;
  updateRoom: (id: string, patch: Partial<RoomFacts>) => void;
  removeRoom: (id: string) => void;
  addCircuit: () => void;
  updateCircuit: (id: string, patch: Partial<CircuitInput>) => void;
  removeCircuit: (id: string) => void;
  addDevice: (circuitId: string) => void;
  updateDevice: (circuitId: string, deviceId: string, patch: Partial<DeviceInput>) => void;
  removeDevice: (circuitId: string, deviceId: string) => void;
  addLoad: (circuitId: string, preset?: Omit<ApplianceLoad, "id">) => void;
  updateLoad: (circuitId: string, loadId: string, patch: Partial<ApplianceLoad>) => void;
  removeLoad: (circuitId: string, loadId: string) => void;
  setAdvisor: (patch: Partial<AdvisorInput> | null) => void;
  addAdvisorLoad: (preset?: Omit<ApplianceLoad, "id">) => void;
  updateAdvisorLoad: (loadId: string, patch: Partial<ApplianceLoad>) => void;
  removeAdvisorLoad: (loadId: string) => void;
  selectDevice: (id: string | null) => void;
  setActiveStep: (step: number | null) => void;
  setCostOverride: (id: string, cents: number) => void;
}

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}-${idCounter++}-${Date.now() % 100000}`;

/** Starter design: Sebastian's mudroom laundry receptacle. */
const DEFAULT_INPUT: ElectricalInput = {
  system: "mains",
  panel: { label: "Main panel", mainAmps: 200, slots: 40, existing: [] },
  rooms: [
    {
      id: "room-1",
      name: "Mudroom / laundry",
      type: "laundry",
      wallLengths: [feet(12), feet(8)],
    },
  ],
  circuits: [
    {
      id: "circuit-1",
      name: "Laundry — mudroom",
      existing: false,
      breakerAmps: 20,
      poles: 1,
      breakerType: "standard",
      cable: "12/2",
      slot: 15,
      roomId: "room-1",
      devices: [
        {
          id: "device-1",
          kind: "receptacle-gfci",
          config: "line-only",
          position: "end-of-run",
          workType: "new-work",
          roomId: "room-1",
          feedLengthFt: 40,
        },
      ],
      loads: [
        { id: "load-1", name: "Washing machine", va: 1200, qty: 1, continuous: false },
      ],
    },
  ],
  advisor: {
    loads: [
      { id: "adv-1", name: "3D printer (FDM)", va: 300, qty: 6, continuous: true },
      { id: "adv-2", name: "LED shop light", va: 40, qty: 2, continuous: true },
      { id: "adv-3", name: "Ventilation fan", va: 150, qty: 1, continuous: true },
    ],
    breakerAmpsOptions: [15, 20],
    maxCircuits: 2,
  },
};

const patchCircuit = (
  input: ElectricalInput,
  circuitId: string,
  fn: (c: CircuitInput) => CircuitInput,
): ElectricalInput => ({
  ...input,
  circuits: input.circuits.map((c) => (c.id === circuitId ? fn(c) : c)),
});

export const useElectrical = create<ElectricalEditorState>()(
  persist(
    (set) => ({
      input: DEFAULT_INPUT,
      boundDesignId: null,
      selectedDeviceId: "device-1",
      activeStep: null,
      costOverrides: {},
      replaceInput: (input) => set({ input, selectedDeviceId: null, activeStep: null }),
      bindDesign: (boundDesignId, input) =>
        set((s) => ({
          boundDesignId,
          input: input ?? s.input,
          selectedDeviceId: null,
          activeStep: null,
        })),
      setPanel: (patch) =>
        set((s) => ({ input: { ...s.input, panel: { ...s.input.panel, ...patch } } })),
      addRoom: () =>
        set((s) => ({
          input: {
            ...s.input,
            rooms: [
              ...s.input.rooms,
              {
                id: nextId("room"),
                name: `Room ${s.input.rooms.length + 1}`,
                type: "other",
                wallLengths: [],
              },
            ],
          },
        })),
      updateRoom: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            rooms: s.input.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          },
        })),
      removeRoom: (id) =>
        set((s) => ({
          input: { ...s.input, rooms: s.input.rooms.filter((r) => r.id !== id) },
        })),
      addCircuit: () =>
        set((s) => ({
          input: {
            ...s.input,
            circuits: [
              ...s.input.circuits,
              {
                id: nextId("circuit"),
                name: `Circuit ${s.input.circuits.length + 1}`,
                existing: false,
                breakerAmps: 15,
                poles: 1,
                breakerType: "standard",
                cable: "14/2",
                devices: [],
                loads: [],
              },
            ],
          },
        })),
      updateCircuit: (id, patch) =>
        set((s) => ({ input: patchCircuit(s.input, id, (c) => ({ ...c, ...patch })) })),
      removeCircuit: (id) =>
        set((s) => ({
          input: { ...s.input, circuits: s.input.circuits.filter((c) => c.id !== id) },
        })),
      addDevice: (circuitId) =>
        set((s) => {
          const id = nextId("device");
          return {
            input: patchCircuit(s.input, circuitId, (c) => ({
              ...c,
              devices: [
                ...c.devices,
                {
                  id,
                  kind: "receptacle-duplex",
                  config: "end-of-run",
                  position: "end-of-run",
                  workType: "new-work",
                  roomId: c.roomId,
                },
              ],
            })),
            selectedDeviceId: id,
            activeStep: null,
          };
        }),
      updateDevice: (circuitId, deviceId, patch) =>
        set((s) => ({
          input: patchCircuit(s.input, circuitId, (c) => ({
            ...c,
            devices: c.devices.map((d) => {
              if (d.id !== deviceId) return d;
              const next = { ...d, ...patch };
              // kind change → snap to that kind's first configuration
              if (patch.kind && patch.kind !== d.kind && !patch.config) {
                const first = deviceSpec(patch.kind)?.configs[0];
                if (first) {
                  next.config = first.id;
                  next.position = first.validPositions[0]!;
                }
              }
              return next;
            }),
          })),
        })),
      removeDevice: (circuitId, deviceId) =>
        set((s) => ({
          input: patchCircuit(s.input, circuitId, (c) => ({
            ...c,
            devices: c.devices.filter((d) => d.id !== deviceId),
          })),
          selectedDeviceId: s.selectedDeviceId === deviceId ? null : s.selectedDeviceId,
        })),
      addLoad: (circuitId, preset) =>
        set((s) => ({
          input: patchCircuit(s.input, circuitId, (c) => ({
            ...c,
            loads: [
              ...c.loads,
              { id: nextId("load"), name: "New load", va: 100, qty: 1, continuous: false, ...preset },
            ],
          })),
        })),
      updateLoad: (circuitId, loadId, patch) =>
        set((s) => ({
          input: patchCircuit(s.input, circuitId, (c) => ({
            ...c,
            loads: c.loads.map((l) => (l.id === loadId ? { ...l, ...patch } : l)),
          })),
        })),
      removeLoad: (circuitId, loadId) =>
        set((s) => ({
          input: patchCircuit(s.input, circuitId, (c) => ({
            ...c,
            loads: c.loads.filter((l) => l.id !== loadId),
          })),
        })),
      setAdvisor: (patch) =>
        set((s) => ({
          input: {
            ...s.input,
            advisor:
              patch === null
                ? undefined
                : { loads: [], breakerAmpsOptions: [15, 20], maxCircuits: 2, ...s.input.advisor, ...patch },
          },
        })),
      addAdvisorLoad: (preset) =>
        set((s) => ({
          input: {
            ...s.input,
            advisor: {
              breakerAmpsOptions: [15, 20],
              maxCircuits: 2,
              ...s.input.advisor,
              loads: [
                ...(s.input.advisor?.loads ?? []),
                { id: nextId("adv"), name: "New load", va: 100, qty: 1, continuous: false, ...preset },
              ],
            },
          },
        })),
      updateAdvisorLoad: (loadId, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            advisor: s.input.advisor && {
              ...s.input.advisor,
              loads: s.input.advisor.loads.map((l) =>
                l.id === loadId ? { ...l, ...patch } : l,
              ),
            },
          },
        })),
      removeAdvisorLoad: (loadId) =>
        set((s) => ({
          input: {
            ...s.input,
            advisor: s.input.advisor && {
              ...s.input.advisor,
              loads: s.input.advisor.loads.filter((l) => l.id !== loadId),
            },
          },
        })),
      selectDevice: (selectedDeviceId) => set({ selectedDeviceId, activeStep: null }),
      setActiveStep: (activeStep) => set({ activeStep }),
      setCostOverride: (id, cents) =>
        set((s) => ({ costOverrides: { ...s.costOverrides, [id]: cents } })),
    }),
    {
      name: "homereno-electrical",
      partialize: (s) => ({ input: s.input, costOverrides: s.costOverrides }),
    },
  ),
);

/** Convention heights for the framed-wall marker defaults. */
export const MARKER_DEFAULTS = {
  xOnWall: inches(24),
  receptacleAFF: inches(12),
  switchAFF: inches(48),
};
