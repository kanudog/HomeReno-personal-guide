import { describe, expect, it } from "vitest";
import { computeElectrical, parseElectricalInput } from "../index";
import { FIXTURES } from "../fixtures";
import { DEVICES } from "../data/devices";
import { CABLES, MAX_BREAKER_BY_AWG, pickWireNut } from "../data/conductors";
import { BOXES, fromIn3 } from "../data/boxes";
import { ELECTRICAL_CODE_NOTES, electricalCodeNote } from "../data/codeNotes";
import { buildDevicePlan, cableForRole } from "./connections";
import { computeBoxFill } from "./boxFill";
import { runAdvisor } from "./advisor";
import type { CircuitInput, DeviceInput, ElectricalInput } from "../types";

const get = (name: keyof typeof FIXTURES) => computeElectrical(FIXTURES[name]);

// ---------------------------------------------------------------------------
// Golden: mudroom-laundry (new 20A GFCI on the new mudroom wall)
// ---------------------------------------------------------------------------
describe("golden: mudroom-laundry", () => {
  const out = get("mudroom-laundry");

  it("plans one GFCI wired LINE-only into an 18 in³ new-work box", () => {
    expect(out.devicePlans).toHaveLength(1);
    const plan = out.devicePlans[0]!;
    expect(plan.displayName).toBe("GFCI 1");
    expect(plan.boxFill.boxId).toBe("1g-nw-18");
    expect(plan.boxFill.totalFill).toBe(fromIn3(11.25)); // 2×2.25 + 2.25 + 4.5
    expect(plan.boxFill.pass).toBe(true);
    expect(plan.wirenuts).toHaveLength(0);
    expect(plan.connections.map((c) => c.target)).toEqual([
      { kind: "terminal", terminalId: "ground", terminalLabel: "Green ground screw" },
      { kind: "terminal", terminalId: "line-silver", terminalLabel: "LINE silver (neutral from panel)" },
      { kind: "terminal", terminalId: "line-brass", terminalLabel: "LINE brass (hot from panel)" },
    ]);
  });

  it("passes the load check (washer on a 20A circuit)", () => {
    expect(out.circuitLoads).toEqual([
      {
        circuitId: "c-laundry",
        volts: 120,
        breakerAmps: 20,
        capacityVa: 2400,
        connectedVa: 1200,
        continuousVa: 0,
        adjustedVa: 1200,
        pctOfCapacity: 50,
        pass: true,
      },
    ]);
  });

  it("warns only the TR info note (laundry rules all satisfied)", () => {
    expect(out.warnings.map((w) => w.code)).toEqual(["tamper-resistant-required"]);
  });

  it("builds the panel directory with existing + new entries", () => {
    expect(out.panelDirectory).toEqual([
      { slot: 1, label: "HVAC air handler", amps: 30, poles: 2, isNew: false },
      { slot: 15, label: "Laundry — mudroom", amps: 20, poles: 1, isNew: true },
    ]);
  });

  it("shops a 50' spool of 12/2, a 20A TR GFCI, box, plate, staples, breaker", () => {
    expect(out.shopping.map((l) => [l.id, l.qty])).toEqual([
      ["cable-12-2-50", 1],
      ["device-receptacle-gfci-20", 1],
      ["box-1g-nw-18", 1],
      ["plate-decora", 1],
      ["staples", 1],
      ["breaker-20-1-standard", 1],
    ]);
    const gfci = out.shopping.find((l) => l.id === "device-receptacle-gfci-20")!;
    expect(gfci.description).toContain("20A TR");
  });

  it("puts verify-dead first and rough-in before make-up", () => {
    expect(out.tasks[0]!.title).toBe("Kill the power and verify dead");
    expect(out.tasks.map((t) => t.title)).toEqual([
      "Kill the power and verify dead",
      "Mount boxes and pull cable — Laundry — mudroom",
      "Wire GFCI 1 — End of run (LINE only)",
      "Land the breakers and label the directory",
      "Energize and test everything",
    ]);
    expect(out.tasks[2]!.diagramRef).toEqual({ deviceId: "d-gfci" });
  });
});

// ---------------------------------------------------------------------------
// Golden: printing-room (existing 15A circuit, 6 printers — the advisor call)
// ---------------------------------------------------------------------------
describe("golden: printing-room", () => {
  const out = get("printing-room");

  it("fails the existing 15A circuit on adjusted load", () => {
    expect(out.circuitLoads[0]).toMatchObject({
      connectedVa: 2030,
      continuousVa: 2030,
      adjustedVa: 2538, // ceil(2030 × 1.25)
      capacityVa: 1800,
      pctOfCapacity: 141,
      pass: false,
    });
  });

  it("warns: GFCI (finished basement), spacing, TR, and overload", () => {
    expect(out.warnings.map((w) => [w.code, w.severity])).toEqual([
      ["gfci-required", "warn"],
      ["tamper-resistant-required", "info"],
      ["receptacle-spacing", "warn"],
      ["load-exceeds-capacity", "danger"],
    ]);
  });

  it("advisor: one breaker fails at 15A and 20A; two 15A circuits pass and win", () => {
    const advisor = out.advisor!;
    expect(advisor.totalConnectedVa).toBe(2030);
    expect(advisor.totalAdjustedVa).toBe(2538);
    expect(advisor.scenarios.map((s) => [s.id, s.pass])).toEqual([
      ["1x15", false],
      ["1x20", false],
      ["2x15", true],
      ["2x20", true],
    ]);
    expect(advisor.recommendedId).toBe("2x15");

    const split = advisor.scenarios.find((s) => s.id === "2x15")!;
    expect(split.circuits.map((c) => [c.assignedSummary, c.adjustedVa, c.pass])).toEqual([
      ["3D printer (FDM) ×3, Ventilation fan", 1313, true],
      ["3D printer (FDM) ×3, LED shop light ×2", 1225, true],
    ]);
    expect(split.minHeadroomVa).toBe(487);
  });

  it("existing box buys the device and plate but no cable, box, or breaker", () => {
    expect(out.shopping.map((l) => l.id)).toEqual([
      "device-receptacle-duplex-15",
      "plate-duplex",
      "wire-nuts",
    ]);
    expect(out.devicePlans[0]!.boxFill.boxId).toBe("1g-ow-20"); // 16 in³ fill needs the 20
  });

  it("skips rough-in and panel tasks for an existing circuit", () => {
    expect(out.tasks.map((t) => t.title)).toEqual([
      "Kill the power and verify dead",
      "Wire Receptacle 1 — Middle of run (pigtailed)",
      "Energize and test everything",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Golden: three-way-pair (panel → SW1 → SW2 → light)
// ---------------------------------------------------------------------------
describe("golden: three-way-pair", () => {
  const out = get("three-way-pair");

  it("produces matching plans with commons and travelers landed correctly", () => {
    const [sw1, sw2] = out.devicePlans;
    expect(sw1!.displayName).toBe("3-way switch 1");

    const terminalOf = (plan: typeof sw1, conductorSuffix: string) =>
      plan!.connections.find((c) =>
        c.conductorIds.some((id) => id.endsWith(conductorSuffix)),
      )!.target;

    // SW1: feed black on COMMON; traveler cable's black/red on brass pair
    expect(terminalOf(sw1, "feed.black")).toMatchObject({ terminalId: "common" });
    expect(terminalOf(sw1, "travelers.black")).toMatchObject({ terminalId: "t-a" });
    expect(terminalOf(sw1, "travelers.red")).toMatchObject({ terminalId: "t-b" });
    // SW2: light leg's black on COMMON
    expect(terminalOf(sw2, "leg.black")).toMatchObject({ terminalId: "common" });
  });

  it("marks traveler conductor roles for the diagram palette", () => {
    const sw1 = out.devicePlans[0]!;
    const travelers = sw1.cables.find((c) => c.role === "travelers")!;
    const roles = Object.fromEntries(travelers.conductors.map((c) => [c.color, c.role]));
    expect(roles).toEqual({ black: "traveler", red: "traveler", white: "neutral", bare: "ground" });
    const leg = out.devicePlans[1]!.cables.find((c) => c.role === "leg")!;
    expect(leg.conductors.find((c) => c.color === "black")!.role).toBe("switched");
  });

  it("emits no warnings (paired, gauge OK, tiny load)", () => {
    expect(out.warnings).toEqual([]);
  });

  it("schematic chains panel → breaker → SW1 → SW2 → light", () => {
    expect(out.schematic.nodes.map((n) => n.id)).toEqual([
      "panel",
      "bkr-c-hall",
      "dev-d-sw1",
      "dev-d-sw2",
      "fx-d-sw2-out",
    ]);
    expect(out.schematic.edges.map((e) => [e.from, e.to, e.cable])).toEqual([
      ["panel", "bkr-c-hall", "14/2"],
      ["bkr-c-hall", "dev-d-sw1", "14/2"],
      ["dev-d-sw1", "dev-d-sw2", "14/3"],
      ["dev-d-sw2", "fx-d-sw2-out", "14/2"],
    ]);
  });

  it("shops both cable types with the segment-counting rule", () => {
    const cableLines = out.shopping.filter((l) => l.id.startsWith("cable-"));
    // 14/2: SW1 feed (20+2) + SW2 light leg (15+2) = 39 → ×1.1 = 43 → 50' spool
    // 14/3: SW2 travelers-in (15+2) = 17 → ×1.1 = 19 → 25' spool
    expect(cableLines.map((l) => [l.id, l.qty])).toEqual([
      ["cable-14-2-50", 1],
      ["cable-14-3-25", 1],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Golden: device-coverage (every remaining wave-1 config)
// ---------------------------------------------------------------------------
describe("golden: device-coverage", () => {
  const out = get("device-coverage");

  it("plans all six devices with numbered names", () => {
    expect(out.devicePlans.map((p) => p.displayName)).toEqual([
      "GFCI 1",
      "Receptacle 1",
      "Receptacle 2",
      "Switch 1",
      "Switch 2",
      "Switched receptacle 1",
    ]);
  });

  it("GFCI line-load protects downstream garage receptacles (no gfci warnings)", () => {
    expect(out.warnings.map((w) => w.code)).toEqual(["tamper-resistant-required"]);
  });

  it("half-hot receptacle lands at exactly its old-work box capacity", () => {
    const halfHot = out.devicePlans.find((p) => p.kind === "receptacle-switched")!;
    expect(halfHot.boxFill.boxId).toBe("1g-ow-14");
    expect(halfHot.boxFill.totalFill).toBe(halfHot.boxFill.capacity); // 14.0 in³
    expect(halfHot.boxFill.pass).toBe(true);
    expect(halfHot.connections[0]!.target).toEqual({ kind: "prep" });
  });

  it("caps the spare neutral in the x/3 switch loop", () => {
    const loop = out.devicePlans.find((p) => p.configId === "loop-with-neutral")!;
    const capped = loop.cables[0]!.conductors.find((c) => c.color === "white")!;
    expect(capped.role).toBe("spare");
    expect(loop.wirenuts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Golden: four-way-run (SW1 → 4-way → SW2 → modeled light)
// ---------------------------------------------------------------------------
describe("golden: four-way-run", () => {
  const out = get("four-way-run");

  it("chains the schematic through all four devices with no phantom fixtures", () => {
    expect(out.schematic.edges.map((e) => [e.from, e.to, e.cable])).toEqual([
      ["panel", "bkr-c-stair", "14/2"],
      ["bkr-c-stair", "dev-d-sw1", "14/2"],
      ["dev-d-sw1", "dev-d-4w", "14/3"],
      ["dev-d-4w", "dev-d-sw2", "14/3"],
      ["dev-d-sw2", "dev-d-light", "14/2"],
    ]);
  });

  it("lands the 4-way's pairs cable-by-cable", () => {
    const fourWay = out.devicePlans.find((p) => p.kind === "switch-4way")!;
    const landings = fourWay.connections
      .filter((c) => c.target.kind === "terminal" && c.target.terminalId !== "ground")
      .map((c) => [c.conductorIds[0], (c.target as { terminalId: string }).terminalId]);
    expect(landings).toEqual([
      ["d-4w.from-first.black", "in-a"],
      ["d-4w.from-first.red", "in-b"],
      ["d-4w.to-last.black", "out-a"],
      ["d-4w.to-last.red", "out-b"],
    ]);
  });

  it("wires the modeled light on leads (3 wire-nut splices)", () => {
    const light = out.devicePlans.find((p) => p.kind === "ceiling-light")!;
    expect(light.boxFill.boxId).toBe("rd-nw-21");
    expect(light.wirenuts).toHaveLength(3);
    expect(out.warnings).toEqual([]);
  });

  it("buys each traveler segment exactly once", () => {
    const cableLines = out.shopping.filter((l) => l.id.startsWith("cable-"));
    // 14/2: SW1 feed (20+2) + light feed (15+2) = 39 → 43 → 50' spool
    // 14/3: 4-way in (17) + SW2 in (17) = 34 → 38 → 50' spool
    expect(cableLines.map((l) => [l.id, l.qty])).toEqual([
      ["cable-14-2-50", 1],
      ["cable-14-3-50", 1],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Golden: fan-light-bedroom / dryer-240 / smart-hall (wave-2 devices)
// ---------------------------------------------------------------------------
describe("golden: fan-light-bedroom", () => {
  const out = get("fan-light-bedroom");

  it("splits fan (black) and light (red) onto the right leads in a fan-rated box", () => {
    const fan = out.devicePlans[0]!;
    expect(fan.boxFill.boxId).toBe("fan-nw-15");
    const landings = fan.connections.map((c) => [
      c.conductorIds[0],
      (c.target as { terminalId: string }).terminalId,
    ]);
    expect(landings).toEqual([
      ["d-fan.from-switches.bare", "lead-ground"],
      ["d-fan.from-switches.white", "lead-neutral"],
      ["d-fan.from-switches.black", "lead-fan"],
      ["d-fan.from-switches.red", "lead-light"],
    ]);
  });

  it("satisfies NC bedroom AFCI with the AFCI breaker (no warnings)", () => {
    expect(out.warnings).toEqual([]);
  });

  it("draws the unmodeled two-gang switch box in the schematic", () => {
    expect(out.schematic.nodes.map((n) => n.id)).toEqual([
      "panel",
      "bkr-c-fan",
      "dev-d-fan",
      "fx-d-fan-in",
    ]);
    expect(out.schematic.edges.map((e) => [e.from, e.to])).toEqual([
      ["panel", "bkr-c-fan"],
      ["bkr-c-fan", "fx-d-fan-in"],
      ["fx-d-fan-in", "dev-d-fan"],
    ]);
  });
});

describe("golden: dryer-240", () => {
  const out = get("dryer-240");

  it("computes 240V capacity and passes the dryer load", () => {
    expect(out.circuitLoads[0]).toMatchObject({
      volts: 240,
      capacityVa: 7200,
      connectedVa: 5400,
      pctOfCapacity: 75,
      pass: true,
    });
    expect(out.warnings).toEqual([]);
  });

  it("lands X/Y/W/G and marks the red as a hot leg", () => {
    const dryer = out.devicePlans[0]!;
    expect(dryer.boxFill.boxId).toBe("2g-nw-34");
    const landings = dryer.connections.map((c) => [
      c.conductorIds[0],
      (c.target as { terminalId: string }).terminalId,
    ]);
    expect(landings).toEqual([
      ["d-dryer.feed.bare", "ground"],
      ["d-dryer.feed.white", "term-w"],
      ["d-dryer.feed.black", "term-x"],
      ["d-dryer.feed.red", "term-y"],
    ]);
    const red = dryer.cables[0]!.conductors.find((c) => c.color === "red")!;
    expect(red.role).toBe("hot");
  });

  it("shops the 30A receptacle, 2-pole breaker, and 240 plate (no TR tag)", () => {
    const device = out.shopping.find((l) => l.id === "device-receptacle-240-30")!;
    expect(device.description).toBe("240V receptacle, 30A");
    expect(device.unitCostCents).toBe(1499);
    const breaker = out.shopping.find((l) => l.id === "breaker-30-2-standard")!;
    expect(breaker.unitCostCents).toBe(1978); // 2-pole ≈ 2.2×
    expect(out.shopping.some((l) => l.id === "plate-single-240")).toBe(true);
  });

  it("occupies both slots of the 2-pole space in the directory", () => {
    expect(out.panelDirectory).toEqual([
      { slot: 2, label: "Dryer", amps: 30, poles: 2, isNew: true },
    ]);
  });
});

describe("golden: smart-hall", () => {
  const out = get("smart-hall");

  it("power-at-light loop feeds the smart switch its neutral", () => {
    const smart = out.devicePlans.find((p) => p.kind === "smart-switch")!;
    const landings = smart.connections.map((c) => [
      c.conductorIds[0],
      (c.target as { terminalId: string }).terminalId,
    ]);
    expect(landings).toEqual([
      ["d-smart.loop.bare", "ground"],
      ["d-smart.loop.white", "neutral"],
      ["d-smart.loop.black", "line"],
      ["d-smart.loop.red", "load"],
    ]);
    expect(out.warnings).toEqual([]);
  });

  it("splices the light's leads and passes constant hot down the loop", () => {
    const light = out.devicePlans.find((p) => p.kind === "ceiling-light")!;
    expect(light.boxFill.boxId).toBe("rd-nw-21");
    expect(light.wirenuts).toHaveLength(4); // ground lead, neutral lead, H splice, switched lead
    const loop = light.cables.find((c) => c.role === "loop")!;
    expect(loop.conductors.find((c) => c.color === "red")!.role).toBe("switched");
  });

  it("chains light → smart switch directly (no phantom fixture between)", () => {
    expect(out.schematic.edges.map((e) => [e.from, e.to, e.cable])).toEqual([
      ["panel", "bkr-c-smart", "14/2"],
      ["bkr-c-smart", "dev-d-light", "14/2"],
      ["dev-d-light", "dev-d-smart", "14/3"],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Catalog invariants — hold for every device × configuration
// ---------------------------------------------------------------------------
describe("catalog invariants", () => {
  for (const spec of DEVICES) {
    for (const config of spec.configs) {
      describe(`${spec.kind} / ${config.id}`, () => {
        it("has unique cable roles and valid step references", () => {
          const roles = config.cables.map((c) => c.role);
          expect(new Set(roles).size).toBe(roles.length);

          for (const step of config.steps) {
            for (const take of step.take) {
              const cable = config.cables.find((c) => c.role === take.cableRole);
              expect(cable, `${take.cableRole} exists`).toBeDefined();
              const colors = [
                ...CABLES[cableForRole("14/2", cable!.wires)].insulated,
                "bare",
              ];
              expect(colors).toContain(take.color);
            }
            if (step.target.kind === "terminal") {
              expect(spec.terminals.map((t) => t.id)).toContain(step.target.terminalId);
            }
            if (step.target.kind === "splice" && step.target.pigtailTo) {
              expect(spec.terminals.map((t) => t.id)).toContain(step.target.pigtailTo);
            }
          }
        });

        it("consumes every conductor exactly once", () => {
          const counts = new Map<string, number>();
          for (const cable of config.cables) {
            for (const color of [...CABLES[cableForRole("14/2", cable.wires)].insulated, "bare"]) {
              counts.set(`${cable.role}.${color}`, 0);
            }
          }
          for (const step of config.steps) {
            for (const take of step.take) {
              const key = `${take.cableRole}.${take.color}`;
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
          }
          for (const [key, n] of counts) {
            expect(n, `${key} handled exactly once`).toBe(1);
          }
        });

        it("references only existing code notes", () => {
          for (const id of config.codeNoteIds ?? []) {
            expect(electricalCodeNote(id), id).toBeDefined();
          }
        });

        it("builds a clean plan (box fits, nuts sized, grounds grounded)", () => {
          const circuit: CircuitInput = {
            id: "c-test",
            name: "Test circuit",
            existing: false,
            breakerAmps: 15,
            poles: 1,
            breakerType: "standard",
            cable: "14/2",
            devices: [],
            loads: [],
          };
          const device: DeviceInput = {
            id: "d-test",
            kind: spec.kind,
            config: config.id,
            position: config.validPositions[0]!,
            workType: config.newWorkOk ? "new-work" : "old-work",
          };
          const { plan, warnings } = buildDevicePlan(circuit, device, "Test 1");
          expect(warnings).toEqual([]);
          expect(plan).not.toBeNull();
          expect(plan!.boxFill.pass).toBe(true);

          // every wire nut got a real size
          for (const nut of plan!.wirenuts) {
            expect(nut.size).not.toBe("lever connector");
          }
          // every bare conductor ends grounded: at a green terminal/lead or
          // in a splice that pigtails to one
          const terminals = config.terminalsOverride ?? spec.terminals;
          const isGreen = (terminalId: string) =>
            terminals.find((t) => t.id === terminalId)?.screw === "green";
          for (const cable of plan!.cables) {
            const bare = cable.conductors.find((c) => c.color === "bare")!;
            expect(bare.role).toBe("ground");
            const target = plan!.connections.find((c) => c.conductorIds.includes(bare.id))!.target;
            if (target.kind === "terminal") {
              expect(isGreen(target.terminalId)).toBe(true);
            } else if (target.kind === "wirenut") {
              const nut = plan!.wirenuts.find((n) => n.id === target.wirenutId)!;
              expect(isGreen(nut.pigtail?.toTerminalId ?? "")).toBe(true);
            } else {
              throw new Error("bare conductor must land on ground");
            }
          }
          // steps are contiguous from 0
          expect(plan!.connections.map((c) => c.step)).toEqual(
            plan!.connections.map((_, i) => i),
          );
        });
      });
    }
  }

  it("every ampacity entry maps a real cable", () => {
    for (const type of Object.keys(CABLES)) {
      const awg = CABLES[type as keyof typeof CABLES].awg;
      expect(MAX_BREAKER_BY_AWG[awg]).toBeGreaterThan(0);
    }
  });

  it("box catalog is ordered smallest-first within each family", () => {
    const families = new Map<string, number>();
    for (const box of BOXES) {
      const key = `${box.gangs}|${box.kind}|${!!box.fanRated}|${box.workTypes.join(",")}`;
      const prev = families.get(key);
      if (prev !== undefined) expect(box.capacity as number).toBeGreaterThanOrEqual(prev);
      families.set(key, box.capacity as number);
    }
  });

  it("all code notes are Wake County electrical notes", () => {
    for (const note of ELECTRICAL_CODE_NOTES) {
      expect(note.jurisdiction).toBe("us-nc-wake");
      expect(note.trade).toBe("electrical");
    }
  });
});

// ---------------------------------------------------------------------------
// Unit: box fill, wire nuts, advisor, validation triggers
// ---------------------------------------------------------------------------
describe("box fill", () => {
  const box18 = BOXES.find((b) => b.id === "1g-nw-18")!;

  it("computes the worked NEC example: 12/2 in and out + device", () => {
    const result = computeBoxFill(
      { insulatedByAwg: { 12: 4 }, egcCount: 2, egcAwg: 12, deviceYokes: 1, deviceAwg: 12, clamps: false },
      box18,
    );
    // 4×2.25 + 2.25 + 4.5 = 15.75 in³
    expect(result.totalFill).toBe(fromIn3(15.75));
    expect(result.pass).toBe(true);
  });

  it("fails an overfilled box and suggests the next size", () => {
    const result = computeBoxFill(
      { insulatedByAwg: { 12: 8 }, egcCount: 4, egcAwg: 12, deviceYokes: 1, deviceAwg: 12, clamps: false },
      box18,
    );
    // 8×2.25 + 2.25 + 4.5 = 24.75 in³ > 18
    expect(result.pass).toBe(false);
    expect(result.suggestedBoxId).toBe("2g-nw-34");
  });

  it("is monotonic in conductor count", () => {
    let last = -1;
    for (let n = 2; n <= 8; n++) {
      const r = computeBoxFill(
        { insulatedByAwg: { 14: n }, egcCount: 1, egcAwg: 14, deviceYokes: 1, deviceAwg: 14, clamps: false },
        box18,
      );
      expect(r.totalFill as number).toBeGreaterThan(last);
      last = r.totalFill as number;
    }
  });

  it("adds quarter allowances for grounds past four", () => {
    const four = computeBoxFill(
      { insulatedByAwg: { 14: 2 }, egcCount: 4, egcAwg: 14, deviceYokes: 0, deviceAwg: 14, clamps: false },
      box18,
    );
    const six = computeBoxFill(
      { insulatedByAwg: { 14: 2 }, egcCount: 6, egcAwg: 14, deviceYokes: 0, deviceAwg: 14, clamps: false },
      box18,
    );
    expect((six.totalFill as number) - (four.totalFill as number)).toBe(4); // 2 × ¼×2.0in³
  });
});

describe("wire nuts + cable helpers", () => {
  it("picks sizes from the table", () => {
    expect(pickWireNut(2, 14)).toBe("orange");
    expect(pickWireNut(3, 14)).toBe("yellow");
    expect(pickWireNut(4, 14)).toBe("red");
    expect(pickWireNut(3, 12)).toBe("red");
    expect(pickWireNut(6, 14)).toBeNull();
  });

  it("derives sibling cables at the circuit gauge", () => {
    expect(cableForRole("12/2", 3)).toBe("12/3");
    expect(cableForRole("14/3", 2)).toBe("14/2");
  });
});

describe("advisor", () => {
  it("is deterministic", () => {
    const input = FIXTURES["printing-room"].advisor!;
    expect(JSON.stringify(runAdvisor(input))).toBe(JSON.stringify(runAdvisor(input)));
  });

  it("recommends a single circuit when it fits", () => {
    const result = runAdvisor({
      loads: [{ id: "tv", name: "TV", va: 200, qty: 1, continuous: false }],
    });
    expect(result.recommendedId).toBe("1x15");
  });

  it("reports nothing-passes honestly", () => {
    const result = runAdvisor({
      loads: [{ id: "heat", name: "Heater", va: 4000, qty: 2, continuous: true }],
      maxCircuits: 2,
    });
    expect(result.recommendedId).toBeNull();
    expect(result.notes.some((n) => n.includes("Nothing passes"))).toBe(true);
  });
});

describe("validation triggers", () => {
  const base = (over: Partial<CircuitInput>): ElectricalInput => ({
    system: "mains",
    panel: { label: "P", mainAmps: 200, slots: 40, existing: [] },
    rooms: [],
    circuits: [
      {
        id: "c1",
        name: "Test",
        existing: false,
        breakerAmps: 15,
        poles: 1,
        breakerType: "standard",
        cable: "14/2",
        devices: [],
        loads: [],
        ...over,
      },
    ],
  });

  it("flags 14 AWG on a 20A breaker as danger", () => {
    const out = computeElectrical(base({ breakerAmps: 20 }));
    expect(out.warnings[0]).toMatchObject({ code: "gauge-breaker-mismatch", severity: "danger" });
  });

  it("flags a legacy switch loop used on new work", () => {
    const out = computeElectrical(
      base({
        devices: [
          {
            id: "d1",
            kind: "switch-single-pole",
            config: "loop-legacy",
            position: "end-of-run",
            workType: "new-work",
          },
        ],
      }),
    );
    expect(out.warnings.map((w) => w.code)).toContain("config-not-for-new-work");
  });

  it("flags an unpaired 3-way", () => {
    const out = computeElectrical(
      base({
        devices: [
          {
            id: "d1",
            kind: "switch-3way",
            config: "power-in-first",
            position: "middle-of-run",
            workType: "new-work",
          },
        ],
      }),
    );
    expect(out.warnings.map((w) => w.code)).toContain("three-way-unpaired");
  });

  it("flags panel slot conflicts", () => {
    const input = base({ slot: 5 });
    input.panel.existing = [{ slot: 5, label: "Dryer", amps: 30, poles: 1 }];
    const out = computeElectrical(input);
    expect(out.warnings.map((w) => w.code)).toContain("panel-slot-conflict");
  });

  it("flags unknown device configs as danger", () => {
    const out = computeElectrical(
      base({
        devices: [
          {
            id: "d1",
            kind: "receptacle-duplex",
            config: "nonsense",
            position: "end-of-run",
            workType: "new-work",
          },
        ],
      }),
    );
    expect(out.warnings[0]).toMatchObject({ code: "invalid-device-config", severity: "danger" });
    expect(out.devicePlans).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Schema: defaults keep old rows parseable; pipeline is deterministic
// ---------------------------------------------------------------------------
describe("input schema", () => {
  it("fills defaults from an empty object", () => {
    const parsed = parseElectricalInput({});
    expect(parsed.system).toBe("mains");
    expect(parsed.panel.mainAmps).toBe(200);
    expect(parsed.circuits).toEqual([]);
  });

  it("parses a row missing newer fields (existing, system)", () => {
    const parsed = parseElectricalInput({
      circuits: [
        { id: "c1", name: "Old row", breakerAmps: 15, cable: "14/2" },
      ],
    });
    expect(parsed.circuits[0]!.existing).toBe(false);
    expect(parsed.circuits[0]!.poles).toBe(1);
    expect(parsed.circuits[0]!.devices).toEqual([]);
  });

  it("round-trips every fixture", () => {
    for (const fixture of Object.values(FIXTURES)) {
      expect(parseElectricalInput(JSON.parse(JSON.stringify(fixture)))).toEqual(fixture);
    }
  });

  it("computeElectrical is deterministic", () => {
    for (const fixture of Object.values(FIXTURES)) {
      expect(JSON.stringify(computeElectrical(fixture))).toBe(
        JSON.stringify(computeElectrical(fixture)),
      );
    }
  });
});
