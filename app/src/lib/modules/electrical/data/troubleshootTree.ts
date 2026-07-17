/**
 * Guided multimeter troubleshooting — a deterministic decision tree.
 * Tools assumed: multimeter, non-contact voltage tester (NCV), plug-in
 * 3-light outlet tester (Sebastian owns all three).
 *
 * Structure rules (unit-tested):
 *  - every option.next resolves to a node id
 *  - every node is reachable from "start"
 *  - the graph is acyclic → every path ends at a conclusion
 */

export type TreeTool = "multimeter" | "ncv" | "plug-tester" | "look";

export interface TreeOption {
  label: string;
  next: string;
}

export interface QuestionNode {
  id: string;
  kind: "question";
  tool: TreeTool;
  title: string;
  /** Meter dial / probe placement — shown as the "setup" line. */
  setup?: string;
  instruction: string;
  /** Rendered as a red strip — live-circuit tests etc. */
  safety?: string;
  options: TreeOption[];
  /** Illustration slot (filled by the illustrated-steps phase). */
  illustration?: string;
}

export interface ConclusionNode {
  id: string;
  kind: "conclusion";
  result: "identified" | "fixed" | "fault" | "escalate";
  title: string;
  explanation: string;
  /** What to do about it. */
  action?: string;
  /** Template saved to the device's field notes when launched from a device. */
  fieldNote?: string;
}

export type TreeNode = QuestionNode | ConclusionNode;

export const TREE_START = "start";

export const TROUBLESHOOT_TREE: TreeNode[] = [
  {
    id: "start",
    kind: "question",
    tool: "look",
    title: "What are you trying to figure out?",
    instruction: "Pick the question that matches where you're stuck.",
    options: [
      { label: "Is this circuit really OFF?", next: "vd-1" },
      { label: "Which wire is the HOT (line)?", next: "ih-0" },
      { label: "Which cable is LINE vs LOAD in this box?", next: "ll-0" },
      { label: "An outlet is dead", next: "do-1" },
      { label: "The plug-in tester shows a fault", next: "tf-1" },
    ],
  },

  // ---- verify dead -----------------------------------------------------------
  {
    id: "vd-1",
    kind: "question",
    tool: "ncv",
    title: "Non-contact first pass",
    setup: "NCV tester on; check its battery against a known-live cord first.",
    instruction:
      "Hold the NCV tip against EVERY wire in the box, one at a time — including the whites.",
    options: [
      { label: "It beeps on something", next: "c-vd-still-hot" },
      { label: "Silent on everything", next: "vd-2" },
    ],
  },
  {
    id: "vd-2",
    kind: "question",
    tool: "multimeter",
    title: "Prove it with the meter",
    setup: "Dial to V~ (AC volts). Black probe on bare ground, red probe on each insulated wire in turn.",
    instruction:
      "Test every insulated conductor to ground, then hot-candidates to the white bundle. What do you read?",
    safety: "Hold probes by the finger guards — treat everything as live until this test says otherwise.",
    options: [
      { label: "~120V somewhere", next: "c-vd-still-hot" },
      { label: "0V everywhere", next: "vd-3" },
    ],
  },
  {
    id: "vd-3",
    kind: "question",
    tool: "multimeter",
    title: "Live–dead–live check",
    setup: "Same V~ setting.",
    instruction:
      "Now test a KNOWN-LIVE outlet (hot slot to neutral slot). Does the meter read ~120V there?",
    options: [
      { label: "Yes — meter works", next: "c-vd-dead" },
      { label: "No reading there either", next: "c-vd-meter" },
    ],
  },
  {
    id: "c-vd-still-hot",
    kind: "conclusion",
    result: "fault",
    title: "Something is still HOT",
    explanation:
      "Either the wrong breaker is off, or this box carries a second circuit (very common in switch boxes and multiwire runs).",
    action:
      "Flip candidate breakers one at a time and re-test after each. When you find it, label both the breaker and the box. Never work a box with ANY live conductor in it.",
  },
  {
    id: "c-vd-dead",
    kind: "conclusion",
    result: "fixed",
    title: "Circuit verified dead",
    explanation:
      "NCV silent, 0V on every conductor pair, and the meter proved itself on a live outlet afterward (live–dead–live).",
    action: "Safe to work. Tape the breaker off and keep the meter close.",
    fieldNote: "Verified dead: NCV silent + 0V all pairs + live-dead-live meter check",
  },
  {
    id: "c-vd-meter",
    kind: "conclusion",
    result: "escalate",
    title: "Your meter isn't proving anything",
    explanation:
      "A meter that reads 0V on a live outlet has a blown fuse, dead battery, or wrong dial setting — every '0V' it showed you is now meaningless.",
    action: "Fix or replace the meter (check the dial is on V~, not DC or amps), then start this flow over.",
  },

  // ---- identify hot ----------------------------------------------------------
  {
    id: "ih-0",
    kind: "question",
    tool: "look",
    title: "Set up the hot-wire hunt",
    instruction:
      "Wires separated so no bare copper touches anything, everyone's hands clear, then restore the breaker — this is a LIVE test.",
    safety:
      "Live test: hold probes by the guards, keep one hand in your pocket, and never touch bare conductors.",
    options: [{ label: "Ready — power is back on", next: "ih-1" }],
  },
  {
    id: "ih-1",
    kind: "question",
    tool: "multimeter",
    title: "Each wire to ground",
    setup: "Dial to V~. Black probe on the bare ground (or grounded metal box), red probe on each insulated wire.",
    instruction: "Which wires read ~120V to ground?",
    options: [
      { label: "Exactly one", next: "c-ih-found" },
      { label: "More than one", next: "ih-2" },
      { label: "None", next: "ih-3" },
    ],
  },
  {
    id: "ih-2",
    kind: "question",
    tool: "look",
    title: "Two hots — loop or multiwire",
    instruction:
      "Look at the hot readers: is one of them red, or a white wrapped in black/red tape? And is there a wall switch on this run?",
    options: [
      { label: "Yes — red or re-taped white", next: "c-ih-switched" },
      { label: "Two plain blacks from different cables", next: "c-ih-multiwire" },
    ],
  },
  {
    id: "ih-3",
    kind: "question",
    tool: "multimeter",
    title: "No ground reference?",
    setup: "V~ again. Black probe on the white (neutral) bundle instead, red on each candidate.",
    instruction:
      "Old boxes sometimes have no bare ground to reference. Re-test each candidate against the neutrals. Any ~120V now?",
    options: [
      { label: "Yes — one reads ~120V", next: "c-ih-found" },
      { label: "Still nothing", next: "do-1" },
    ],
  },
  {
    id: "c-ih-found",
    kind: "conclusion",
    result: "identified",
    title: "That's your HOT",
    explanation:
      "The conductor reading ~120V to ground (or to neutral) is the line — the always-hot feed.",
    action:
      "Kill the breaker, verify dead, then mark the hot with black tape and note which cable it belongs to before you disconnect anything.",
    fieldNote: "Hot (line) identified by meter: ~120V to ground",
  },
  {
    id: "c-ih-switched",
    kind: "conclusion",
    result: "identified",
    title: "Steady black = line; red/tagged = switched or traveler",
    explanation:
      "A red or re-identified white that reads hot is a switched leg or traveler. Flip the wall switch: the one that drops to 0V is switched; the one that never moves is your line.",
    action: "Label both before disconnecting — switched legs and travelers must go back exactly where they were.",
    fieldNote: "Line = steady hot; switched leg identified by switch flip test",
  },
  {
    id: "c-ih-multiwire",
    kind: "conclusion",
    result: "escalate",
    title: "Possible multiwire branch circuit (MWBC)",
    explanation:
      "Two always-hot blacks from different cables can mean two circuits sharing this box — possibly sharing a neutral (240V between them!). Miswiring an MWBC neutral can burn things down.",
    action:
      "Test between the two hots: ~240V means MWBC — stop and map both breakers (they should be handle-tied). This is a good place to slow down or call a pro.",
  },

  // ---- line vs load ----------------------------------------------------------
  {
    id: "ll-0",
    kind: "question",
    tool: "look",
    title: "Separate the cables",
    instruction:
      "Breaker OFF and verified dead first. Pull the device, separate the two cables' conductors, and cap each black with a wire nut so nothing touches. Then restore the breaker for the test.",
    safety: "Live test coming — capped hots only, hands clear, probes by the guards.",
    options: [{ label: "Set — power restored", next: "ll-1" }],
  },
  {
    id: "ll-1",
    kind: "question",
    tool: "multimeter",
    title: "Find the feeding cable",
    setup: "V~. For one cable at a time: red probe into that cable's black (pierce the cap opening or uncap carefully), black probe on its white.",
    instruction: "Which cable's black-to-white reads ~120V?",
    options: [
      { label: "One cable only", next: "c-ll-found" },
      { label: "Both cables", next: "c-ih-multiwire" },
      { label: "Neither", next: "do-1" },
    ],
  },
  {
    id: "c-ll-found",
    kind: "conclusion",
    result: "identified",
    title: "That cable is your LINE",
    explanation:
      "The cable showing ~120V black-to-white is fed from the panel — it lands on LINE. The dead cable continues downstream — it lands on LOAD (or gets pigtailed onward).",
    action:
      "Kill the breaker and verify dead again before landing wires. Mark the line cable's sheath with tape so you don't lose it.",
    fieldNote: "LINE cable identified by meter (~120V black-to-white with cables separated)",
  },

  // ---- dead outlet -----------------------------------------------------------
  {
    id: "do-1",
    kind: "question",
    tool: "look",
    title: "Check the easy stuff",
    instruction:
      "Is there a wall switch that controls this outlet? A GFCI upstream that's tripped (check bathroom/garage/kitchen/basement)? A breaker with its handle in the middle position?",
    options: [
      { label: "Found it — fixed", next: "c-solved" },
      { label: "All fine, still dead", next: "do-2" },
    ],
  },
  {
    id: "do-2",
    kind: "question",
    tool: "plug-tester",
    title: "What does the plug-in tester say?",
    instruction: "Plug the 3-light tester into the dead outlet.",
    options: [
      { label: "No lights at all", next: "do-3" },
      { label: "A fault code lights up", next: "tf-1" },
      { label: "Reads correct now", next: "c-intermittent" },
    ],
  },
  {
    id: "do-3",
    kind: "question",
    tool: "multimeter",
    title: "Test at the terminals",
    setup: "Breaker OFF → verify dead → pull the receptacle out → restore power. V~, probes on the device's hot and neutral TERMINALS.",
    instruction: "Reading at the terminals themselves?",
    safety: "Receptacle is hanging live — touch probes to terminals only.",
    options: [
      { label: "~120V at terminals", next: "c-bad-receptacle" },
      { label: "0V at terminals", next: "do-4" },
    ],
  },
  {
    id: "do-4",
    kind: "question",
    tool: "multimeter",
    title: "Hot to ground",
    setup: "V~. Red probe on the hot terminal, black on bare ground.",
    instruction: "Hot-to-GROUND reading?",
    options: [
      { label: "~120V", next: "c-open-neutral" },
      { label: "0V", next: "c-open-hot" },
    ],
  },
  {
    id: "c-solved",
    kind: "conclusion",
    result: "fixed",
    title: "Solved",
    explanation: "The outlet works — it was a switch, a tripped GFCI, or a tripped breaker.",
    action: "If a GFCI or breaker tripped for no obvious reason, keep an eye on it — repeat trips mean a real fault.",
  },
  {
    id: "c-intermittent",
    kind: "conclusion",
    result: "fault",
    title: "Intermittent connection",
    explanation:
      "Working now + dead earlier = a loose connection upstream, almost always a backstabbed receptacle (wire pushed into the spring hole instead of around the screw).",
    action:
      "Kill power and inspect this box and the one before it on the circuit. Move every backstabbed wire to the screw terminals or pigtails. Loose connections make heat.",
  },
  {
    id: "c-bad-receptacle",
    kind: "conclusion",
    result: "fault",
    title: "The receptacle itself failed",
    explanation: "Power reaches the terminals but the face is dead — worn-out contacts.",
    action: "Kill power, verify dead, swap in a new TR receptacle (the app will draw it: add a device with your box's configuration).",
    fieldNote: "Receptacle failed with 120V at terminals — replaced",
  },
  {
    id: "c-open-neutral",
    kind: "conclusion",
    result: "fault",
    title: "Open NEUTRAL upstream",
    explanation:
      "Hot-to-ground reads 120V but hot-to-neutral doesn't — the white path back to the panel is broken somewhere upstream. Open neutrals also make lights flicker and can put 120V where it doesn't belong on MWBCs.",
    action:
      "Kill power. Open this box and the previous working box; inspect every white splice and backstab. Remake suspect splices with fresh wire nuts.",
  },
  {
    id: "c-open-hot",
    kind: "conclusion",
    result: "fault",
    title: "Open HOT upstream",
    explanation:
      "No voltage reaches this box at all — the black path broke between here and the last working point on the circuit.",
    action:
      "Kill power. Walk backward: open the last WORKING box and the first DEAD one; the failed splice or backstab is almost always in one of them.",
  },

  // ---- plug-in tester faults ---------------------------------------------------
  {
    id: "tf-1",
    kind: "question",
    tool: "plug-tester",
    title: "Read the fault code",
    instruction: "Match the tester's light pattern to its legend.",
    options: [
      { label: "Open ground", next: "tf-2" },
      { label: "Hot/neutral reversed", next: "c-reversed" },
      { label: "Open neutral", next: "c-open-neutral" },
      { label: "Open hot", next: "c-open-hot" },
      { label: "Correct — but I suspect a bootleg ground", next: "tf-bootleg" },
    ],
  },
  {
    id: "tf-2",
    kind: "question",
    tool: "multimeter",
    title: "Confirm the open ground",
    setup: "V~. Red probe in the small (hot) slot, black probe in the round ground hole.",
    instruction: "Hot-slot to ground-hole reading?",
    options: [
      { label: "0V — no ground path", next: "tf-3" },
      { label: "~120V — ground path exists", next: "c-flaky-tester" },
    ],
  },
  {
    id: "tf-3",
    kind: "question",
    tool: "look",
    title: "Is there a ground wire at all?",
    instruction:
      "Kill power, verify dead, pull the receptacle: is there bare copper in the box (even folded back in the rear)?",
    options: [
      { label: "Yes — bare copper exists", next: "c-ground-broken" },
      { label: "No — old 2-wire cable", next: "c-no-egc" },
    ],
  },
  {
    id: "tf-bootleg",
    kind: "question",
    tool: "look",
    title: "Check for a bootleg",
    instruction:
      "Kill power, verify dead, pull the receptacle: is there a short jumper connecting the SILVER (neutral) terminal to the green ground screw?",
    options: [
      { label: "Yes — jumper present", next: "c-bootleg" },
      { label: "No jumper", next: "c-solved" },
    ],
  },
  {
    id: "c-reversed",
    kind: "conclusion",
    result: "fault",
    title: "Hot and neutral are swapped",
    explanation:
      "Black and white are on the wrong terminals — everything still 'works,' but lamp shells and appliance chassis end up hot. Usually a swap at THIS device; occasionally upstream.",
    action:
      "Kill power, verify dead, swap the conductors at this device (black → brass, white → silver). Re-test; if still reversed, the swap is in an upstream box.",
    fieldNote: "Reversed polarity found by plug-in tester — corrected",
  },
  {
    id: "c-flaky-tester",
    kind: "conclusion",
    result: "fault",
    title: "Marginal ground path",
    explanation:
      "The meter sees ~120V hot-to-ground but the tester flagged open ground — a loose or corroded (high-resistance) ground that passes a trickle but wouldn't clear a fault.",
    action:
      "Treat it as broken: kill power and remake the ground path — pigtails tight, ground screw snug, connections bright copper.",
  },
  {
    id: "c-ground-broken",
    kind: "conclusion",
    result: "fault",
    title: "Ground exists but isn't continuous",
    explanation:
      "There's an equipment ground in the cable, but it never got connected — or a splice let go — somewhere between here and the panel.",
    action:
      "Reconnect the bare to the device's green screw (pigtail if multiple cables). If it still tests open, walk upstream box by box until the break appears.",
  },
  {
    id: "c-no-egc",
    kind: "conclusion",
    result: "fault",
    title: "Two-wire cable — no ground exists",
    explanation:
      "Pre-1960s NM has no equipment ground. A 3-prong receptacle here is only legal with GFCI protection standing in.",
    action:
      'Code-legal fixes (NEC 250.130(C) / 406.4(D)): a GFCI receptacle labeled "GFCI Protected · No Equipment Ground", a GFCI breaker with the same labels downstream, or new cable. Never add a bootleg jumper.',
  },
  {
    id: "c-bootleg",
    kind: "conclusion",
    result: "fault",
    title: "Bootleg ground — remove it",
    explanation:
      "A neutral-to-ground jumper fakes out testers but puts normal circuit current on everything 'grounded' — and if the neutral ever opens, chassis go fully hot. Dangerous and illegal.",
    action:
      "Kill power, remove the jumper, then treat the outlet as the no-ground case: GFCI protection with the proper labels, or new cable.",
  },
];

const nodeMap = new Map(TROUBLESHOOT_TREE.map((n) => [n.id, n]));

export function treeNode(id: string): TreeNode | undefined {
  return nodeMap.get(id);
}
