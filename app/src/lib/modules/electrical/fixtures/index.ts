import { feet, type Sixteenths } from "@/lib/units";
import type { ElectricalInput } from "../types";

/**
 * Golden fixtures — Sebastian's real projects plus a catalog-coverage
 * circuit. Tests pin these outputs exactly; change them deliberately.
 */

const ft = (n: number): Sixteenths => feet(n);

/**
 * The mudroom/laundry wall: a new 20A GFCI receptacle on the wall he's
 * framing in the app. Dedicated laundry circuit, new work, 40' home run.
 */
const mudroomLaundry: ElectricalInput = {
  system: "mains",
  panel: {
    label: "Main panel — garage",
    mainAmps: 200,
    slots: 40,
    existing: [{ slot: 1, label: "HVAC air handler", amps: 30, poles: 2 }],
  },
  rooms: [
    {
      id: "mudroom",
      name: "Mudroom / laundry",
      type: "laundry",
      wallLengths: [ft(12), ft(8)],
    },
  ],
  circuits: [
    {
      id: "c-laundry",
      name: "Laundry — mudroom",
      existing: false,
      breakerAmps: 20,
      poles: 1,
      breakerType: "standard",
      cable: "12/2",
      slot: 15,
      roomId: "mudroom",
      devices: [
        {
          id: "d-gfci",
          kind: "receptacle-gfci",
          config: "line-only",
          position: "end-of-run",
          workType: "new-work",
          roomId: "mudroom",
          feedLengthFt: 40,
        },
      ],
      loads: [{ id: "washer", name: "Washing machine", va: 1200, qty: 1, continuous: false }],
    },
  ],
};

/**
 * The 3D printing room: an existing 15A circuit that can't carry six
 * printers + lights + ventilation. The advisor answers "one breaker or two?"
 */
const printingRoom: ElectricalInput = {
  system: "mains",
  panel: { label: "Main panel — garage", mainAmps: 200, slots: 40, existing: [] },
  rooms: [
    {
      id: "printroom",
      name: "Printing room",
      type: "basement-finished",
      wallLengths: [ft(10), ft(10)],
    },
  ],
  circuits: [
    {
      id: "c-existing",
      name: "Basement receptacles",
      existing: true,
      breakerAmps: 15,
      poles: 1,
      breakerType: "standard",
      cable: "14/2",
      slot: 7,
      roomId: "printroom",
      devices: [
        {
          id: "d-existing-recep",
          kind: "receptacle-duplex",
          config: "middle-of-run",
          position: "middle-of-run",
          workType: "existing-box",
          roomId: "printroom",
        },
      ],
      loads: [
        { id: "printer", name: "3D printer (FDM)", va: 300, qty: 6, continuous: true },
        { id: "leds", name: "LED shop light", va: 40, qty: 2, continuous: true },
        { id: "vent", name: "Ventilation fan", va: 150, qty: 1, continuous: true },
      ],
    },
  ],
  advisor: {
    loads: [
      { id: "printer", name: "3D printer (FDM)", va: 300, qty: 6, continuous: true },
      { id: "leds", name: "LED shop light", va: 40, qty: 2, continuous: true },
      { id: "vent", name: "Ventilation fan", va: 150, qty: 1, continuous: true },
    ],
    breakerAmpsOptions: [15, 20],
    maxCircuits: 2,
  },
};

/** A modern 3-way pair: panel → switch 1 → switch 2 → hallway light. */
const threeWayPair: ElectricalInput = {
  system: "mains",
  panel: { label: "Main panel", mainAmps: 200, slots: 40, existing: [] },
  rooms: [{ id: "hall", name: "Hallway", type: "other", wallLengths: [] }],
  circuits: [
    {
      id: "c-hall",
      name: "Hall lights",
      existing: false,
      breakerAmps: 15,
      poles: 1,
      breakerType: "standard",
      cable: "14/2",
      slot: 9,
      roomId: "hall",
      devices: [
        {
          id: "d-sw1",
          kind: "switch-3way",
          config: "power-in-first",
          position: "middle-of-run",
          workType: "new-work",
          feedLengthFt: 20,
        },
        {
          id: "d-sw2",
          kind: "switch-3way",
          config: "light-out-last",
          position: "middle-of-run",
          workType: "new-work",
        },
      ],
      loads: [{ id: "hall-light", name: "Hall fixture (LED)", va: 30, qty: 2, continuous: true }],
    },
  ],
};

/** Every remaining wave-1 configuration on two garage circuits. */
const deviceCoverage: ElectricalInput = {
  system: "mains",
  panel: { label: "Main panel", mainAmps: 200, slots: 40, existing: [] },
  rooms: [
    { id: "garage", name: "Garage", type: "garage", wallLengths: [ft(20), ft(10)] },
  ],
  circuits: [
    {
      id: "c-bench",
      name: "Garage bench receptacles",
      existing: false,
      breakerAmps: 20,
      poles: 1,
      breakerType: "standard",
      cable: "12/2",
      slot: 17,
      roomId: "garage",
      devices: [
        {
          id: "d-gfci-first",
          kind: "receptacle-gfci",
          config: "line-load",
          position: "middle-of-run",
          workType: "new-work",
          feedLengthFt: 30,
        },
        {
          id: "d-mid",
          kind: "receptacle-duplex",
          config: "middle-of-run",
          position: "middle-of-run",
          workType: "new-work",
        },
        {
          id: "d-end",
          kind: "receptacle-duplex",
          config: "end-of-run",
          position: "end-of-run",
          workType: "new-work",
        },
      ],
      loads: [],
    },
    {
      id: "c-lights",
      name: "Garage lights + switched outlet",
      existing: false,
      breakerAmps: 15,
      poles: 1,
      breakerType: "gfci",
      cable: "14/2",
      slot: 19,
      roomId: "garage",
      devices: [
        {
          id: "d-sp",
          kind: "switch-single-pole",
          config: "power-at-switch",
          position: "middle-of-run",
          workType: "new-work",
          feedLengthFt: 25,
        },
        {
          id: "d-loop",
          kind: "switch-single-pole",
          config: "loop-with-neutral",
          position: "end-of-run",
          workType: "new-work",
        },
        {
          id: "d-halfhot",
          kind: "receptacle-switched",
          config: "fed-from-switch-3wire",
          position: "end-of-run",
          workType: "old-work",
        },
      ],
      loads: [],
    },
  ],
};

export const FIXTURES = {
  "mudroom-laundry": mudroomLaundry,
  "printing-room": printingRoom,
  "three-way-pair": threeWayPair,
  "device-coverage": deviceCoverage,
} as const;
