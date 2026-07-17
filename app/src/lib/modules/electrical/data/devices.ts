import type { ConductorColor, DeviceKind, DevicePosition } from "../types";

/**
 * Device catalog: every wiring configuration the engine can produce, as
 * reviewable data. Wave 1 = receptacles (duplex/GFCI/switched) + switches
 * (single-pole, 3-way). Wave 2 adds fans/fixtures, 4-way, dimmers, smart,
 * and 240V.
 *
 * 3-way topology note: wave 1 ships the modern topology
 * (panel → switch 1 → switch 2 → light, neutral through — the layout
 * NEC 404.2(C) pushes new work toward). Legacy power-at-light loop
 * topologies land with wave 2's old-work variants.
 */

export interface TerminalSpec {
  id: string;
  label: string;
  screw: "brass" | "silver" | "green" | "black";
}

export interface CableRoleSpec {
  role: string;
  label: string;
  /** Insulated conductor count; gauge follows the circuit's cable. */
  wires: 2 | 3;
  direction: "in" | "out";
  /** What the far end is, for schematic + shopping labels. */
  toward: string;
}

export type StepTargetSpec =
  | { kind: "terminal"; terminalId: string }
  /** Wire-nut splice; optional pigtail continues to a terminal. */
  | { kind: "splice"; group: string; pigtailTo?: string }
  /** Solo conductor capped with a wire nut (spare). */
  | { kind: "cap"; group: string }
  /** Non-wiring action (e.g. breaking a tab). */
  | { kind: "prep" };

export interface ConnectionStepSpec {
  take: { cableRole: string; color: ConductorColor }[];
  /** Re-tape this conductor before landing it (legacy loops). */
  reidentify?: ConductorColor;
  target: StepTargetSpec;
  instruction: string;
}

export interface DeviceConfigSpec {
  id: string;
  label: string;
  description: string;
  validPositions: DevicePosition[];
  /** false → legacy wiring; warn when used on new work (NEC 404.2(C)). */
  newWorkOk: boolean;
  cables: CableRoleSpec[];
  steps: ConnectionStepSpec[];
  notes?: string[];
  codeNoteIds?: string[];
  /** For paired devices (3-way sets): the partner config expected on the circuit. */
  pairsWith?: { kind: DeviceKind; configId: string };
}

export interface DeviceSpec {
  kind: DeviceKind;
  label: string;
  /** Base for numbered display names ("GFCI 1"). */
  displayBase: string;
  terminals: TerminalSpec[];
  /** Box-fill yokes (NEC 314.16(B)(4)). */
  yokes: number;
  plate: "duplex" | "decora" | "toggle";
  /** Unit price cents by receptacle/switch amp rating. */
  priceCentsByRating: Record<number, number>;
  shoppingQuery: string;
  configs: DeviceConfigSpec[];
}

const GROUND_DIRECT = (cableRole: string): ConnectionStepSpec => ({
  take: [{ cableRole, color: "bare" }],
  target: { kind: "terminal", terminalId: "ground" },
  instruction:
    "Hook the bare ground clockwise around the green ground screw and tighten.",
});

const GROUND_SPLICE = (roles: string[]): ConnectionStepSpec => ({
  take: roles.map((cableRole) => ({ cableRole, color: "bare" as ConductorColor })),
  target: { kind: "splice", group: "G", pigtailTo: "ground" },
  instruction:
    'Twist all bare grounds together with a 6" bare pigtail under a wire nut, then land the pigtail on the green ground screw.',
});

export const DEVICES: DeviceSpec[] = [
  // -------------------------------------------------------------------------
  {
    kind: "receptacle-duplex",
    label: "Duplex receptacle",
    displayBase: "Receptacle",
    terminals: [
      { id: "brass", label: "Brass terminal (hot)", screw: "brass" },
      { id: "silver", label: "Silver terminal (neutral)", screw: "silver" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "duplex",
    priceCentsByRating: { 15: 379, 20: 549 },
    shoppingQuery: "tamper resistant duplex receptacle",
    configs: [
      {
        id: "end-of-run",
        label: "End of run",
        description: "Last box on the circuit — one cable in.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
        ],
        steps: [
          GROUND_DIRECT("feed"),
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "silver" },
            instruction: "Hook the white neutral clockwise around a silver terminal and tighten.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "brass" },
            instruction: "Hook the black hot clockwise around a brass terminal and tighten.",
          },
        ],
      },
      {
        id: "middle-of-run",
        label: "Middle of run (pigtailed)",
        description: "Circuit continues downstream — two cables, pigtailed to the device.",
        validPositions: ["middle-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "onward", label: "Onward", wires: 2, direction: "out", toward: "next device" },
        ],
        steps: [
          GROUND_SPLICE(["feed", "onward"]),
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "onward", color: "white" },
            ],
            target: { kind: "splice", group: "N", pigtailTo: "silver" },
            instruction:
              'Splice both white neutrals with a 6" white pigtail under a wire nut; land the pigtail on a silver terminal.',
          },
          {
            take: [
              { cableRole: "feed", color: "black" },
              { cableRole: "onward", color: "black" },
            ],
            target: { kind: "splice", group: "H", pigtailTo: "brass" },
            instruction:
              'Splice both black hots with a 6" black pigtail under a wire nut; land the pigtail on a brass terminal.',
          },
        ],
        notes: [
          "Pigtails — not the device's screws — carry power downstream, so the rest of the circuit stays connected if this receptacle is ever removed.",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "receptacle-gfci",
    label: "GFCI receptacle",
    displayBase: "GFCI",
    terminals: [
      { id: "line-brass", label: "LINE brass (hot from panel)", screw: "brass" },
      { id: "line-silver", label: "LINE silver (neutral from panel)", screw: "silver" },
      { id: "load-brass", label: "LOAD brass (protected hot out)", screw: "brass" },
      { id: "load-silver", label: "LOAD silver (protected neutral out)", screw: "silver" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "decora",
    priceCentsByRating: { 15: 1999, 20: 2199 },
    shoppingQuery: "GFCI outlet tamper resistant self test",
    configs: [
      {
        id: "line-only",
        label: "End of run (LINE only)",
        description: "One cable in — feed lands on LINE; LOAD stays unused.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
        ],
        steps: [
          GROUND_DIRECT("feed"),
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "line-silver" },
            instruction: "Land the white neutral on the LINE silver terminal.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "line-brass" },
            instruction: "Land the black hot on the LINE brass terminal.",
          },
        ],
        notes: ["Leave the factory tape on the LOAD terminals — they stay empty in this configuration."],
        codeNoteIds: ["nc-wake-elec-gfci-test"],
      },
      {
        id: "line-load",
        label: "Middle of run (protects downstream)",
        description: "Feed on LINE, downstream cable on LOAD — everything past this box is GFCI-protected.",
        validPositions: ["middle-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "onward", label: "Protected onward", wires: 2, direction: "out", toward: "downstream devices" },
        ],
        steps: [
          GROUND_SPLICE(["feed", "onward"]),
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "line-silver" },
            instruction: "Land the FEED white on the LINE silver terminal — never on LOAD.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "line-brass" },
            instruction: "Land the FEED black on the LINE brass terminal.",
          },
          {
            take: [{ cableRole: "onward", color: "white" }],
            target: { kind: "terminal", terminalId: "load-silver" },
            instruction: "Land the DOWNSTREAM white on the LOAD silver terminal.",
          },
          {
            take: [{ cableRole: "onward", color: "black" }],
            target: { kind: "terminal", terminalId: "load-brass" },
            instruction: "Land the DOWNSTREAM black on the LOAD brass terminal.",
          },
        ],
        notes: [
          'Everything wired past this box is now GFCI-protected — stick "GFCI Protected" labels on those downstream receptacles.',
          "Swapping LINE and LOAD is the classic GFCI miswire: the receptacle face stays dead and the TEST button won't behave. Double-check before closing up.",
        ],
        codeNoteIds: ["nc-wake-elec-gfci-test"],
      },
      {
        id: "middle-line-only",
        label: "Middle of run (no downstream protection)",
        description: "Circuit passes through on pigtails; only this receptacle is protected.",
        validPositions: ["middle-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "onward", label: "Onward (unprotected)", wires: 2, direction: "out", toward: "next device" },
        ],
        steps: [
          GROUND_SPLICE(["feed", "onward"]),
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "onward", color: "white" },
            ],
            target: { kind: "splice", group: "N", pigtailTo: "line-silver" },
            instruction:
              'Splice both whites with a 6" white pigtail; land the pigtail on the LINE silver terminal.',
          },
          {
            take: [
              { cableRole: "feed", color: "black" },
              { cableRole: "onward", color: "black" },
            ],
            target: { kind: "splice", group: "H", pigtailTo: "line-brass" },
            instruction:
              'Splice both blacks with a 6" black pigtail; land the pigtail on the LINE brass terminal.',
          },
        ],
        notes: ["Downstream devices are NOT GFCI-protected in this configuration — the LOAD terminals stay empty."],
        codeNoteIds: ["nc-wake-elec-gfci-test"],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "receptacle-switched",
    label: "Switched (half-hot) receptacle",
    displayBase: "Switched receptacle",
    terminals: [
      { id: "brass-bottom", label: "Bottom brass (always hot)", screw: "brass" },
      { id: "brass-top", label: "Top brass (switched)", screw: "brass" },
      { id: "silver", label: "Silver terminal (neutral)", screw: "silver" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "duplex",
    priceCentsByRating: { 15: 379, 20: 549 },
    shoppingQuery: "tamper resistant duplex receptacle",
    configs: [
      {
        id: "fed-from-switch-3wire",
        label: "Fed from switch box (x/3)",
        description:
          "Three-conductor cable from the switch box: black always-hot, red switched, white neutral. Top half switches, bottom half stays live.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "from-switch", label: "From switch", wires: 3, direction: "in", toward: "switch box" },
        ],
        steps: [
          {
            take: [],
            target: { kind: "prep" },
            instruction:
              "Snap off the BRASS-side tab between the two brass terminals with needle-nose pliers. Leave the silver-side tab intact.",
          },
          GROUND_DIRECT("from-switch"),
          {
            take: [{ cableRole: "from-switch", color: "white" }],
            target: { kind: "terminal", terminalId: "silver" },
            instruction: "Land the white neutral on a silver terminal (tab intact — it feeds both halves).",
          },
          {
            take: [{ cableRole: "from-switch", color: "black" }],
            target: { kind: "terminal", terminalId: "brass-bottom" },
            instruction: "Land the black always-hot on the BOTTOM brass terminal.",
          },
          {
            take: [{ cableRole: "from-switch", color: "red" }],
            target: { kind: "terminal", terminalId: "brass-top" },
            instruction: "Land the red switched hot on the TOP brass terminal.",
          },
        ],
        notes: [
          "If the tab between the brass terminals isn't removed, the switch will fight the always-hot feed — the whole receptacle stays live and the breaker may trip.",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "switch-single-pole",
    label: "Single-pole switch",
    displayBase: "Switch",
    terminals: [
      { id: "t1", label: "Terminal 1 (feed)", screw: "brass" },
      { id: "t2", label: "Terminal 2 (switch leg)", screw: "brass" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "toggle",
    priceCentsByRating: { 15: 249, 20: 449 },
    shoppingQuery: "single pole light switch",
    configs: [
      {
        id: "power-at-switch",
        label: "Power at switch",
        description: "Feed arrives here; a switch leg runs up to the light.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "leg", label: "Switch leg", wires: 2, direction: "out", toward: "light" },
        ],
        steps: [
          GROUND_SPLICE(["feed", "leg"]),
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "leg", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction:
              "Splice the two white neutrals straight through under a wire nut — a plain switch never touches neutral.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "t1" },
            instruction: "Land the FEED black on terminal 1.",
          },
          {
            take: [{ cableRole: "leg", color: "black" }],
            target: { kind: "terminal", terminalId: "t2" },
            instruction: "Land the switch-leg black (up to the light) on terminal 2.",
          },
        ],
      },
      {
        id: "loop-with-neutral",
        label: "Switch loop with neutral (x/3)",
        description:
          "Power is up at the light; a three-conductor loop drops to the switch so a neutral is present (NEC 404.2(C)).",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "loop", label: "Loop from light", wires: 3, direction: "in", toward: "light box" },
        ],
        steps: [
          GROUND_DIRECT("loop"),
          {
            take: [{ cableRole: "loop", color: "white" }],
            target: { kind: "cap", group: "N" },
            instruction:
              "Cap the white neutral with a wire nut and fold it back — it's the spare neutral NEC 404.2(C) requires at the switch (smart switches can use it later).",
          },
          {
            take: [{ cableRole: "loop", color: "black" }],
            target: { kind: "terminal", terminalId: "t1" },
            instruction: "Land the black (hot down from the light box) on terminal 1.",
          },
          {
            take: [{ cableRole: "loop", color: "red" }],
            target: { kind: "terminal", terminalId: "t2" },
            instruction: "Land the red (switched return up to the light) on terminal 2.",
          },
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
      {
        id: "loop-legacy",
        label: "Legacy switch loop (x/2, old work only)",
        description:
          "Existing two-wire loop from the light — the white is re-identified as a hot. Fine to keep in old work; not allowed for new runs.",
        validPositions: ["end-of-run"],
        newWorkOk: false,
        cables: [
          { role: "loop", label: "Loop from light", wires: 2, direction: "in", toward: "light box" },
        ],
        steps: [
          GROUND_DIRECT("loop"),
          {
            take: [{ cableRole: "loop", color: "white" }],
            reidentify: "black",
            target: { kind: "terminal", terminalId: "t1" },
            instruction:
              "Wrap black tape around the white wire at BOTH ends — it's a hot feed in this loop, not a neutral — then land it on terminal 1.",
          },
          {
            take: [{ cableRole: "loop", color: "black" }],
            target: { kind: "terminal", terminalId: "t2" },
            instruction: "Land the black (switched return to the light) on terminal 2.",
          },
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "switch-3way",
    label: "3-way switch",
    displayBase: "3-way switch",
    terminals: [
      { id: "common", label: "COMMON (black screw)", screw: "black" },
      { id: "t-a", label: "Traveler A (brass)", screw: "brass" },
      { id: "t-b", label: "Traveler B (brass)", screw: "brass" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "toggle",
    priceCentsByRating: { 15: 449, 20: 649 },
    shoppingQuery: "3 way light switch",
    configs: [
      {
        id: "power-in-first",
        label: "First switch (power in)",
        description:
          "Feed arrives at this switch; a three-conductor cable carries the travelers (and neutral) to the partner switch.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "travelers", label: "Travelers", wires: 3, direction: "out", toward: "partner 3-way" },
        ],
        steps: [
          GROUND_SPLICE(["feed", "travelers"]),
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "travelers", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction:
              "Splice the whites straight through — the neutral rides along to the partner box and on to the light.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "common" },
            instruction:
              "Land the FEED black on the COMMON terminal — the odd-colored (black) screw, never a brass one.",
          },
          {
            take: [{ cableRole: "travelers", color: "black" }],
            target: { kind: "terminal", terminalId: "t-a" },
            instruction: "Land the traveler cable's black on either brass traveler terminal.",
          },
          {
            take: [{ cableRole: "travelers", color: "red" }],
            target: { kind: "terminal", terminalId: "t-b" },
            instruction: "Land the traveler cable's red on the other brass traveler terminal.",
          },
        ],
        notes: [
          "Travelers are interchangeable between the two brass screws. The COMMON is not — it's the darker screw and takes the feed (here) or the light leg (at the partner).",
        ],
        pairsWith: { kind: "switch-3way", configId: "light-out-last" },
      },
      {
        id: "light-out-last",
        label: "Second switch (light out)",
        description:
          "Travelers arrive from the partner switch; a two-conductor leg leaves for the light.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "travelers", label: "Travelers", wires: 3, direction: "in", toward: "partner 3-way" },
          { role: "leg", label: "Light leg", wires: 2, direction: "out", toward: "light" },
        ],
        steps: [
          GROUND_SPLICE(["travelers", "leg"]),
          {
            take: [
              { cableRole: "travelers", color: "white" },
              { cableRole: "leg", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction: "Splice the whites straight through — neutral continues up to the light.",
          },
          {
            take: [{ cableRole: "leg", color: "black" }],
            target: { kind: "terminal", terminalId: "common" },
            instruction: "Land the light leg's black on the COMMON terminal — switched hot up to the light.",
          },
          {
            take: [{ cableRole: "travelers", color: "black" }],
            target: { kind: "terminal", terminalId: "t-a" },
            instruction: "Land the traveler cable's black on either brass traveler terminal.",
          },
          {
            take: [{ cableRole: "travelers", color: "red" }],
            target: { kind: "terminal", terminalId: "t-b" },
            instruction: "Land the traveler cable's red on the other brass traveler terminal.",
          },
        ],
        pairsWith: { kind: "switch-3way", configId: "power-in-first" },
      },
    ],
  },
];

export function deviceSpec(kind: DeviceKind): DeviceSpec | undefined {
  return DEVICES.find((d) => d.kind === kind);
}

export function deviceConfig(kind: DeviceKind, configId: string): DeviceConfigSpec | undefined {
  return deviceSpec(kind)?.configs.find((c) => c.id === configId);
}
