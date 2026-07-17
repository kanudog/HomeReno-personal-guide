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
  screw: "brass" | "silver" | "green" | "black" | "blue";
  /**
   * A wire lead rather than a screw — landing a conductor here is a
   * wire-nut splice (fixture leads, dimmer leads). Counts a wire nut.
   */
  splice?: boolean;
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
  /** NEMA variants etc. — replaces the device's terminals for this config. */
  terminalsOverride?: TerminalSpec[];
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
  /** Box-fill yokes (NEC 314.16(B)(4)); fixtures on leads count 0. */
  yokes: number;
  plate: "duplex" | "decora" | "toggle" | "single-240" | "none";
  /** Which box family this device mounts in (default "device"). */
  boxKind?: "device" | "ceiling" | "ceiling-fan";
  /** Physical size floor — 240V receptacles need a 2-gang opening. */
  minGangs?: number;
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

  // -------------------------------------------------------------------------
  {
    kind: "switch-4way",
    label: "4-way switch",
    displayBase: "4-way switch",
    terminals: [
      { id: "in-a", label: "Input pair A (dark screws)", screw: "black" },
      { id: "in-b", label: "Input pair B (dark screws)", screw: "black" },
      { id: "out-a", label: "Output pair A (brass screws)", screw: "brass" },
      { id: "out-b", label: "Output pair B (brass screws)", screw: "brass" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "toggle",
    priceCentsByRating: { 15: 899 },
    shoppingQuery: "4 way light switch",
    configs: [
      {
        id: "between-3ways",
        label: "Between the 3-ways",
        description:
          "Sits mid-run between the two 3-way switches; both traveler cables pass through it.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "from-first", label: "Travelers in", wires: 3, direction: "in", toward: "first 3-way (or previous 4-way)" },
          { role: "to-last", label: "Travelers out", wires: 3, direction: "out", toward: "second 3-way (or next 4-way)" },
        ],
        steps: [
          GROUND_SPLICE(["from-first", "to-last"]),
          {
            take: [
              { cableRole: "from-first", color: "white" },
              { cableRole: "to-last", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction: "Splice the whites straight through — neutral just passes by.",
          },
          {
            take: [{ cableRole: "from-first", color: "black" }],
            target: { kind: "terminal", terminalId: "in-a" },
            instruction: "Land the INCOMING cable's black on one dark (input) screw.",
          },
          {
            take: [{ cableRole: "from-first", color: "red" }],
            target: { kind: "terminal", terminalId: "in-b" },
            instruction: "Land the INCOMING cable's red on the other dark (input) screw.",
          },
          {
            take: [{ cableRole: "to-last", color: "black" }],
            target: { kind: "terminal", terminalId: "out-a" },
            instruction: "Land the OUTGOING cable's black on one brass (output) screw.",
          },
          {
            take: [{ cableRole: "to-last", color: "red" }],
            target: { kind: "terminal", terminalId: "out-b" },
            instruction: "Land the OUTGOING cable's red on the other brass (output) screw.",
          },
        ],
        notes: [
          "Both travelers of the SAME cable land on the SAME color pair — mixing the pairs is the classic 4-way mistake. If the circuit misbehaves, swap one cable's two conductors between its pair.",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "dimmer-single-pole",
    label: "Dimmer (single-pole)",
    displayBase: "Dimmer",
    terminals: [
      { id: "lead-1", label: "Black lead 1", screw: "black", splice: true },
      { id: "lead-2", label: "Black lead 2", screw: "black", splice: true },
      { id: "lead-ground", label: "Green ground lead", screw: "green", splice: true },
    ],
    yokes: 1,
    plate: "decora",
    priceCentsByRating: { 15: 2199 },
    shoppingQuery: "LED dimmer switch single pole",
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
          {
            take: [
              { cableRole: "feed", color: "bare" },
              { cableRole: "leg", color: "bare" },
            ],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut both bare grounds to the dimmer's green lead.",
          },
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "leg", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction: "Splice the neutrals straight through — this dimmer doesn't use them.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-1" },
            instruction: "Wire-nut the FEED black to one of the dimmer's black leads.",
          },
          {
            take: [{ cableRole: "leg", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-2" },
            instruction: "Wire-nut the switch-leg black (up to the light) to the other black lead.",
          },
        ],
        notes: [
          "Check the dimmer's load range against your bulbs — LEDs need a dimmer rated for them, and many dimmers derate when ganged side by side.",
        ],
      },
      {
        id: "loop-with-neutral",
        label: "Switch loop with neutral (x/3)",
        description: "Power at the light; x/3 loop drops here (NEC 404.2(C)).",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "loop", label: "Loop from light", wires: 3, direction: "in", toward: "light box" },
        ],
        steps: [
          {
            take: [{ cableRole: "loop", color: "bare" }],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut the bare ground to the dimmer's green lead.",
          },
          {
            take: [{ cableRole: "loop", color: "white" }],
            target: { kind: "cap", group: "N" },
            instruction: "Cap the white neutral and fold it back — spare, per NEC 404.2(C).",
          },
          {
            take: [{ cableRole: "loop", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-1" },
            instruction: "Wire-nut the black (hot down from the light) to a black lead.",
          },
          {
            take: [{ cableRole: "loop", color: "red" }],
            target: { kind: "terminal", terminalId: "lead-2" },
            instruction: "Wire-nut the red (switched return) to the other black lead.",
          },
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
      {
        id: "loop-legacy",
        label: "Legacy switch loop (x/2, old work only)",
        description: "Existing two-wire loop — white re-identified as hot.",
        validPositions: ["end-of-run"],
        newWorkOk: false,
        cables: [
          { role: "loop", label: "Loop from light", wires: 2, direction: "in", toward: "light box" },
        ],
        steps: [
          {
            take: [{ cableRole: "loop", color: "bare" }],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut the bare ground to the dimmer's green lead.",
          },
          {
            take: [{ cableRole: "loop", color: "white" }],
            reidentify: "black",
            target: { kind: "terminal", terminalId: "lead-1" },
            instruction:
              "Re-tape the white black at both ends (it's a hot), then wire-nut it to a black lead.",
          },
          {
            take: [{ cableRole: "loop", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-2" },
            instruction: "Wire-nut the black (switched return) to the other black lead.",
          },
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "dimmer-3way",
    label: "Dimmer (3-way)",
    displayBase: "3-way dimmer",
    terminals: [
      { id: "lead-common", label: "Common lead (black)", screw: "black", splice: true },
      { id: "lead-t1", label: "Traveler lead 1 (red)", screw: "brass", splice: true },
      { id: "lead-t2", label: "Traveler lead 2 (red)", screw: "brass", splice: true },
      { id: "lead-ground", label: "Green ground lead", screw: "green", splice: true },
    ],
    yokes: 1,
    plate: "decora",
    priceCentsByRating: { 15: 2799 },
    shoppingQuery: "3 way LED dimmer switch",
    configs: [
      {
        id: "power-in-first",
        label: "First position (power in)",
        description: "Feed arrives at this dimmer; travelers leave for the partner switch.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "travelers", label: "Travelers", wires: 3, direction: "out", toward: "partner 3-way" },
        ],
        steps: [
          {
            take: [
              { cableRole: "feed", color: "bare" },
              { cableRole: "travelers", color: "bare" },
            ],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut both bare grounds to the dimmer's green lead.",
          },
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "travelers", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction: "Splice the whites straight through to the partner box.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-common" },
            instruction: "Wire-nut the FEED black to the dimmer's COMMON (black) lead.",
          },
          {
            take: [{ cableRole: "travelers", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-t1" },
            instruction: "Wire-nut the traveler cable's black to a traveler lead.",
          },
          {
            take: [{ cableRole: "travelers", color: "red" }],
            target: { kind: "terminal", terminalId: "lead-t2" },
            instruction: "Wire-nut the traveler cable's red to the other traveler lead.",
          },
        ],
        notes: [
          "Lead colors follow the common Lutron convention — check YOUR dimmer's instructions; brands vary. Most 3-way dimmers pair with a plain 3-way switch (only one dimmer per pair).",
        ],
        pairsWith: { kind: "switch-3way", configId: "light-out-last" },
      },
      {
        id: "light-out-last",
        label: "Second position (light out)",
        description: "Travelers arrive; the light leg leaves from this dimmer.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "travelers", label: "Travelers", wires: 3, direction: "in", toward: "partner 3-way" },
          { role: "leg", label: "Light leg", wires: 2, direction: "out", toward: "light" },
        ],
        steps: [
          {
            take: [
              { cableRole: "travelers", color: "bare" },
              { cableRole: "leg", color: "bare" },
            ],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut both bare grounds to the dimmer's green lead.",
          },
          {
            take: [
              { cableRole: "travelers", color: "white" },
              { cableRole: "leg", color: "white" },
            ],
            target: { kind: "splice", group: "N" },
            instruction: "Splice the whites straight through — neutral continues to the light.",
          },
          {
            take: [{ cableRole: "leg", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-common" },
            instruction: "Wire-nut the light leg's black to the COMMON (black) lead.",
          },
          {
            take: [{ cableRole: "travelers", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-t1" },
            instruction: "Wire-nut the traveler cable's black to a traveler lead.",
          },
          {
            take: [{ cableRole: "travelers", color: "red" }],
            target: { kind: "terminal", terminalId: "lead-t2" },
            instruction: "Wire-nut the traveler cable's red to the other traveler lead.",
          },
        ],
        pairsWith: { kind: "switch-3way", configId: "power-in-first" },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "smart-switch",
    label: "Smart switch",
    displayBase: "Smart switch",
    terminals: [
      { id: "line", label: "LINE terminal (hot in)", screw: "brass" },
      { id: "load", label: "LOAD terminal (to light)", screw: "brass" },
      { id: "neutral", label: "Neutral terminal (silver)", screw: "silver" },
      { id: "ground", label: "Green ground screw", screw: "green" },
    ],
    yokes: 1,
    plate: "decora",
    priceCentsByRating: { 15: 2499 },
    shoppingQuery: "smart light switch neutral required",
    configs: [
      {
        id: "neutral-power-at-switch",
        label: "Power at switch (neutral connected)",
        description: "Feed arrives here; the smart switch powers itself from the neutral.",
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
            target: { kind: "splice", group: "N", pigtailTo: "neutral" },
            instruction:
              'Splice both whites with a 6" white pigtail; land the pigtail on the NEUTRAL terminal — that\'s what keeps the radio alive.',
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "line" },
            instruction: "Land the FEED black on LINE.",
          },
          {
            take: [{ cableRole: "leg", color: "black" }],
            target: { kind: "terminal", terminalId: "load" },
            instruction: "Land the switch-leg black on LOAD.",
          },
        ],
        notes: ["Pick switches that match one ecosystem (Matter/Zigbee/Wi-Fi) — mixing hubs gets old fast."],
      },
      {
        id: "neutral-loop",
        label: "Switch loop with neutral (x/3)",
        description:
          "Power at the light, x/3 loop here — the 404.2(C) spare neutral is exactly what a smart switch needs.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "loop", label: "Loop from light", wires: 3, direction: "in", toward: "light box" },
        ],
        steps: [
          GROUND_DIRECT("loop"),
          {
            take: [{ cableRole: "loop", color: "white" }],
            target: { kind: "terminal", terminalId: "neutral" },
            instruction: "Land the white on the NEUTRAL terminal — the spare the x/3 loop carried for exactly this.",
          },
          {
            take: [{ cableRole: "loop", color: "black" }],
            target: { kind: "terminal", terminalId: "line" },
            instruction: "Land the black (hot down from the light) on LINE.",
          },
          {
            take: [{ cableRole: "loop", color: "red" }],
            target: { kind: "terminal", terminalId: "load" },
            instruction: "Land the red (switched return to the light) on LOAD.",
          },
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
      {
        id: "no-neutral-legacy",
        label: "No-neutral smart switch (x/2 loop, old work)",
        description:
          "Existing 2-wire loop with no neutral — requires a no-neutral smart switch model.",
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
            target: { kind: "terminal", terminalId: "line" },
            instruction:
              "Re-tape the white black at both ends (hot feed in this loop), then land it on LINE.",
          },
          {
            take: [{ cableRole: "loop", color: "black" }],
            target: { kind: "terminal", terminalId: "load" },
            instruction: "Land the black (switched return) on LOAD.",
          },
        ],
        notes: [
          "Only NO-NEUTRAL models work here (Lutron Caseta and similar) — a neutral-required switch will never power up. Check the minimum bulb load; some need a bypass capacitor at the fixture.",
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "ceiling-light",
    label: "Ceiling light fixture",
    displayBase: "Light",
    terminals: [
      { id: "lead-hot", label: "Black fixture lead", screw: "black", splice: true },
      { id: "lead-neutral", label: "White fixture lead", screw: "silver", splice: true },
      { id: "lead-ground", label: "Fixture ground lead (green/bare)", screw: "green", splice: true },
    ],
    yokes: 0,
    plate: "none",
    boxKind: "ceiling",
    priceCentsByRating: { 15: 0 },
    shoppingQuery: "flush mount ceiling light fixture",
    configs: [
      {
        id: "end-of-run",
        label: "Switched feed at the fixture",
        description: "The cable arriving here is already switched (a switch leg or 3-way common).",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Switched feed", wires: 2, direction: "in", toward: "panel / previous device" },
        ],
        steps: [
          {
            take: [{ cableRole: "feed", color: "bare" }],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut the bare ground to the fixture's ground lead (and the box's ground screw if metal).",
          },
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "lead-neutral" },
            instruction: "Wire-nut the white neutral to the fixture's white lead.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-hot" },
            instruction: "Wire-nut the black (switched hot) to the fixture's black lead.",
          },
        ],
      },
      {
        id: "power-at-light-loop",
        label: "Power at the light, loop to switch (x/3)",
        description:
          "Constant power lands at the fixture box; a three-conductor loop drops to the switch.",
        validPositions: ["middle-of-run", "end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel / previous device" },
          { role: "loop", label: "Switch loop", wires: 3, direction: "out", toward: "switch (loop down)" },
        ],
        steps: [
          {
            take: [
              { cableRole: "feed", color: "bare" },
              { cableRole: "loop", color: "bare" },
            ],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut both bare grounds together with the fixture's ground lead.",
          },
          {
            take: [
              { cableRole: "feed", color: "white" },
              { cableRole: "loop", color: "white" },
            ],
            target: { kind: "terminal", terminalId: "lead-neutral" },
            instruction:
              "Wire-nut the feed white, the loop white (the neutral riding down to the switch), and the fixture's white lead together.",
          },
          {
            take: [
              { cableRole: "feed", color: "black" },
              { cableRole: "loop", color: "black" },
            ],
            target: { kind: "splice", group: "H" },
            instruction: "Splice the feed black to the loop black — constant hot down to the switch.",
          },
          {
            take: [{ cableRole: "loop", color: "red" }],
            target: { kind: "terminal", terminalId: "lead-hot" },
            instruction: "Wire-nut the loop's red (switched return from the switch) to the fixture's black lead.",
          },
        ],
        notes: [
          "Pairs with the x/3 switch-loop configuration at the switch box (plain, dimmer, or smart).",
        ],
        codeNoteIds: ["nc-wake-elec-neutral-at-switch"],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "ceiling-fan",
    label: "Ceiling fan (with light kit)",
    displayBase: "Fan",
    terminals: [
      { id: "lead-fan", label: "Black lead (fan motor)", screw: "black", splice: true },
      { id: "lead-light", label: "Blue lead (light kit)", screw: "blue", splice: true },
      { id: "lead-neutral", label: "White lead", screw: "silver", splice: true },
      { id: "lead-ground", label: "Ground lead (green/bare)", screw: "green", splice: true },
    ],
    yokes: 0,
    plate: "none",
    boxKind: "ceiling-fan",
    priceCentsByRating: { 15: 0 },
    shoppingQuery: "ceiling fan with light",
    configs: [
      {
        id: "single-switch",
        label: "One switch runs everything",
        description: "A single switched feed; fan and light come on together (pull chains split them).",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Switched feed", wires: 2, direction: "in", toward: "panel / previous device" },
        ],
        steps: [
          {
            take: [{ cableRole: "feed", color: "bare" }],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut the bare ground to the fan's ground lead and the bracket's ground screw.",
          },
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "lead-neutral" },
            instruction: "Wire-nut the white neutral to the fan's white lead.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-fan" },
            instruction:
              "Wire-nut the switched black to BOTH the black fan lead and the blue light lead — one switch runs fan and light together.",
          },
        ],
        notes: ["The box must be FAN-RATED (NEC 314.27(C)) — a standard ceiling box will not hold a fan."],
      },
      {
        id: "fan-light-separate",
        label: "Fan and light on separate switches (x/3)",
        description:
          "Three-conductor cable from a two-gang switch box: black switches the fan, red switches the light.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "from-switches", label: "From switches", wires: 3, direction: "in", toward: "two-gang switch box" },
        ],
        steps: [
          {
            take: [{ cableRole: "from-switches", color: "bare" }],
            target: { kind: "terminal", terminalId: "lead-ground" },
            instruction: "Wire-nut the bare ground to the fan's ground lead and the bracket's ground screw.",
          },
          {
            take: [{ cableRole: "from-switches", color: "white" }],
            target: { kind: "terminal", terminalId: "lead-neutral" },
            instruction: "Wire-nut the white neutral to the fan's white lead.",
          },
          {
            take: [{ cableRole: "from-switches", color: "black" }],
            target: { kind: "terminal", terminalId: "lead-fan" },
            instruction: "Wire-nut the black (fan switch) to the black fan lead.",
          },
          {
            take: [{ cableRole: "from-switches", color: "red" }],
            target: { kind: "terminal", terminalId: "lead-light" },
            instruction: "Wire-nut the red (light switch) to the blue light-kit lead.",
          },
        ],
        notes: [
          "Feed x/3 from a two-gang box with two single-pole switches (fan on black, light on red). The box must be FAN-RATED (NEC 314.27(C)).",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    kind: "receptacle-240",
    label: "240V receptacle",
    displayBase: "240V receptacle",
    terminals: [
      { id: "term-x", label: "Brass X (hot 1)", screw: "brass" },
      { id: "term-y", label: "Brass Y (hot 2)", screw: "brass" },
      { id: "term-w", label: "Silver W (neutral)", screw: "silver" },
      { id: "ground", label: "Green G (ground)", screw: "green" },
    ],
    yokes: 1,
    plate: "single-240",
    minGangs: 2,
    priceCentsByRating: { 30: 1499, 50: 1899 },
    shoppingQuery: "NEMA receptacle",
    configs: [
      {
        id: "nema-14-30-dryer",
        label: "NEMA 14-30 (dryer, 4-wire)",
        description: "30A dryer receptacle on 10/3: two hots, neutral, ground.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 3, direction: "in", toward: "panel (2-pole breaker)" },
        ],
        steps: [
          GROUND_DIRECT("feed"),
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "term-w" },
            instruction: "Land the white neutral on the silver W terminal.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "term-x" },
            instruction: "Land the black hot on brass X.",
          },
          {
            take: [{ cableRole: "feed", color: "red" }],
            target: { kind: "terminal", terminalId: "term-y" },
            instruction: "Land the red hot on brass Y.",
          },
        ],
        notes: [
          "4-wire is the modern standard — never bond neutral and ground together at the receptacle (that ended in 1996). If the dryer cord is 3-prong, replace the CORD, not the receptacle.",
        ],
      },
      {
        id: "nema-14-50-range-ev",
        label: "NEMA 14-50 (range / EV, 4-wire)",
        description: "50A receptacle on 6/3: range or EV charging.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 3, direction: "in", toward: "panel (2-pole breaker)" },
        ],
        steps: [
          GROUND_DIRECT("feed"),
          {
            take: [{ cableRole: "feed", color: "white" }],
            target: { kind: "terminal", terminalId: "term-w" },
            instruction: "Land the white neutral on the silver W terminal.",
          },
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "term-x" },
            instruction: "Land the black hot on brass X.",
          },
          {
            take: [{ cableRole: "feed", color: "red" }],
            target: { kind: "terminal", terminalId: "term-y" },
            instruction: "Land the red hot on brass Y.",
          },
        ],
        notes: [
          "EV charging is a continuous load: a 50A circuit supports at most a 40A charge rate (80%). Use an industrial-grade receptacle for daily EV plugging — the $10 ones die.",
        ],
      },
      {
        id: "nema-6-50-welder",
        label: "NEMA 6-50 (welder, no neutral)",
        description: "50A straight-240 receptacle on 6/2: two hots and ground, no neutral.",
        validPositions: ["end-of-run"],
        newWorkOk: true,
        cables: [
          { role: "feed", label: "Feed", wires: 2, direction: "in", toward: "panel (2-pole breaker)" },
        ],
        terminalsOverride: [
          { id: "term-x", label: "Brass X (hot 1)", screw: "brass" },
          { id: "term-y", label: "Brass Y (hot 2)", screw: "brass" },
          { id: "ground", label: "Green G (ground)", screw: "green" },
        ],
        steps: [
          GROUND_DIRECT("feed"),
          {
            take: [{ cableRole: "feed", color: "black" }],
            target: { kind: "terminal", terminalId: "term-x" },
            instruction: "Land the black hot on brass X.",
          },
          {
            take: [{ cableRole: "feed", color: "white" }],
            reidentify: "red",
            target: { kind: "terminal", terminalId: "term-y" },
            instruction:
              "Re-tape the white RED at both ends — it's hot leg 2 on this 240V circuit (no neutral, NEC 200.7(C)) — then land it on brass Y.",
          },
        ],
        notes: ["There is no neutral on a 6-50 — both insulated conductors are hot legs."],
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
