import type { DevicePlan, ElectricalInput, ElectricalTask } from "../types";
import { boxById } from "../data/boxes";
import { STRIP } from "../data/conductors";
import { deviceConfig } from "../data/devices";

/**
 * Ordered install tasks. "Kill power and verify dead" is ALWAYS task 1 —
 * that ordering is a design guarantee, not a preference.
 */
export function generateElectricalTasks(
  input: ElectricalInput,
  plans: DevicePlan[],
): ElectricalTask[] {
  const tasks: ElectricalTask[] = [];
  let seq = 0;
  const circuitById = new Map(input.circuits.map((c) => [c.id, c]));
  const deviceById = new Map(
    input.circuits.flatMap((c) => c.devices.map((d) => [d.id, d] as const)),
  );

  const breakerList = input.circuits
    .map((c) => `${c.name}${c.slot !== undefined ? ` (slot ${c.slot})` : ""}`)
    .join(", ");
  tasks.push({
    seq: seq++,
    title: "Kill the power and verify dead",
    detail: `Switch off: ${breakerList || "the affected breakers"}. Then PROVE it at each box you'll open: non-contact tester on every wire first, then meter each conductor to ground and to neutral — expect 0V. Check your meter on a known-live outlet before and after (live-dead-live). If anything still reads hot, a second circuit shares the box — stop and find it.`,
    deviceIds: [],
    codeNoteIds: ["nc-wake-elec-verify-dead", "nc-wake-elec-permit"],
  });

  // ---- rough-in per new circuit ------------------------------------------------
  for (const circuit of input.circuits) {
    const circuitPlans = plans.filter((p) => p.circuitId === circuit.id);
    const newWork = circuitPlans.filter(
      (p) => deviceById.get(p.deviceId)?.workType === "new-work",
    );
    if (newWork.length === 0) continue;

    const boxLines = newWork
      .map((p) => {
        const box = boxById(p.boxFill.boxId);
        const where = p.kind.startsWith("ceiling")
          ? "the fixture location (ceiling)"
          : p.kind.includes("switch") || p.kind.startsWith("dimmer")
            ? 'switch height (48" to center)'
            : 'receptacle height (12" to bottom; 240V: where the appliance cord reaches)';
        return `${p.displayName}: ${box?.label ?? p.boxFill.boxLabel} at ${where}`;
      })
      .join("; ");
    const cableLines = [
      ...new Set(
        circuitPlans.flatMap((p) => p.cables.map((c) => `${c.type} (${c.label})`)),
      ),
    ].join("; ");

    tasks.push({
      seq: seq++,
      title: `Mount boxes and pull cable — ${circuit.name}`,
      detail: `Boxes (heights are convention, not code): ${boxLines}. Pull: ${cableLines}. Staple within 8" of each box and every 4.5' of run; leave ${STRIP.freeConductor} at every box, and don't nick conductors when stripping sheath (score, snap, peel). Rough-in gets INSPECTED before drywall goes up.`,
      circuitId: circuit.id,
      deviceIds: newWork.map((p) => p.deviceId),
      codeNoteIds: [
        "nc-wake-elec-cable-support",
        "nc-wake-elec-free-conductor",
        "nc-wake-elec-box-fill",
        "nc-wake-elec-permit",
      ],
    });
  }

  // ---- one make-up task per device ------------------------------------------------
  for (const circuit of input.circuits) {
    for (const plan of plans.filter((p) => p.circuitId === circuit.id)) {
      const config = deviceConfig(plan.kind, plan.configId);
      const stepsText = plan.connections
        .map((c, i) => `${i + 1}) ${c.instruction}`)
        .join(" ");
      const fieldNotes = deviceById.get(plan.deviceId)?.fieldNotes;
      const notes =
        (plan.notes.length > 0 ? ` NOTE: ${plan.notes.join(" ")}` : "") +
        (fieldNotes ? ` FIELD NOTES: ${fieldNotes}` : "");
      tasks.push({
        seq: seq++,
        title: `Wire ${plan.displayName} — ${plan.configLabel}`,
        detail: `Strip ${STRIP.wirenut} for splices, ${STRIP.screwHook} hooks for screws (wrap clockwise). ${stepsText} Fold conductors accordion-style into the box (grounds deepest, hots last) and screw the device home.${notes}`,
        circuitId: circuit.id,
        deviceIds: [plan.deviceId],
        diagramRef: { deviceId: plan.deviceId },
        codeNoteIds: config?.codeNoteIds,
      });
    }
  }

  // ---- panel work -------------------------------------------------------------------
  const newCircuits = input.circuits.filter((c) => !c.existing);
  if (newCircuits.length > 0) {
    const lines = newCircuits
      .map(
        (c) =>
          `${c.name}: ${c.breakerAmps}A${c.poles === 2 ? " 2-pole" : ""}${c.breakerType !== "standard" ? ` ${c.breakerType.toUpperCase()}` : ""}${c.slot !== undefined ? ` in slot ${c.slot}` : ""}`,
      )
      .join("; ");
    tasks.push({
      seq: seq++,
      title: "Land the breakers and label the directory",
      detail: `With the MAIN off and verified: ${lines}. Home-run black to the breaker terminal, white to the neutral bar, bare to the ground bar (GFCI/AFCI breakers: their coiled white pigtail goes to the neutral bar, circuit white to the breaker). Torque to the label spec. Fill in the panel directory before the cover goes back on.`,
      deviceIds: [],
      codeNoteIds: ["nc-wake-elec-permit", "nc-wake-elec-labeling"],
    });
  }

  // ---- energize + test ----------------------------------------------------------------
  const hasGfci = plans.some((p) => p.kind === "receptacle-gfci");
  const has3way = plans.some((p) => p.kind === "switch-3way");
  tasks.push({
    seq: seq++,
    title: "Energize and test everything",
    detail: `Breakers on. Plug-in tester in every receptacle — two amber lights, no red, means wired correctly.${hasGfci ? " Press TEST on each GFCI: it and everything on its LOAD side must go dead; RESET restores." : ""}${has3way ? " Work each 3-way pair from both ends — the light must toggle from either switch in any combination." : ""} Then schedule the inspection.`,
    deviceIds: plans.map((p) => p.deviceId),
    codeNoteIds: ["nc-wake-elec-gfci-test", "nc-wake-elec-labeling", "nc-wake-elec-permit"],
  });

  return tasks;
}
