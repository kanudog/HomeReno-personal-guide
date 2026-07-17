import type {
  DevicePlan,
  ElectricalInput,
  SchematicEdge,
  SchematicModel,
  SchematicNode,
} from "../types";
import { deviceConfig } from "../data/devices";

/**
 * Whole-circuit line diagram: panel → breaker → devices in wiring order
 * (the order devices appear on the circuit IS the electrical order).
 * Unmodeled far ends (light fixtures, a switch feeding a half-hot) become
 * fixture nodes so the run reads complete.
 */
export function buildSchematic(
  input: ElectricalInput,
  plansByDevice: Map<string, DevicePlan>,
): SchematicModel {
  const nodes: SchematicNode[] = [];
  const edges: SchematicEdge[] = [];

  nodes.push({
    id: "panel",
    kind: "panel",
    label: input.panel.label,
    sub: `${input.panel.mainAmps}A main · ${input.panel.slots} spaces`,
  });

  for (const circuit of input.circuits) {
    const breakerId = `bkr-${circuit.id}`;
    const typeTag = circuit.breakerType === "standard" ? "" : ` ${circuit.breakerType.toUpperCase()}`;
    nodes.push({
      id: breakerId,
      kind: "breaker",
      label: circuit.name,
      sub: `${circuit.breakerAmps}A${circuit.poles === 2 ? " 2-pole" : ""}${typeTag}${circuit.slot !== undefined ? ` · slot ${circuit.slot}` : ""}${circuit.existing ? " · existing" : ""}`,
      circuitId: circuit.id,
    });
    edges.push({
      from: "panel",
      to: breakerId,
      cable: circuit.cable,
      label: "breaker",
    });

    let prev = breakerId;
    for (const [index, device] of circuit.devices.entries()) {
      const isLast = index === circuit.devices.length - 1;
      const plan = plansByDevice.get(device.id);
      if (!plan) continue;
      const config = deviceConfig(plan.kind, plan.configId);
      const deviceNodeId = `dev-${device.id}`;
      nodes.push({
        id: deviceNodeId,
        kind: "device",
        label: plan.displayName,
        sub: plan.configLabel,
        circuitId: circuit.id,
        deviceId: device.id,
      });

      const inSpec = config?.cables.find((c) => c.direction === "in");
      const inCable = plan.cables.find((c) => c.role === inSpec?.role);
      // Far-end helper nodes only make sense when nothing is modeled between
      // the breaker and this device — otherwise the chain already shows it.
      const prevIsBreaker = prev === breakerId;

      if (inSpec && inCable && prevIsBreaker && /light/i.test(inSpec.toward)) {
        // Power reaches the fixture first; the loop drops to this device.
        const fixtureId = `fx-${device.id}-in`;
        nodes.push({
          id: fixtureId,
          kind: "fixture",
          label: "Light fixture",
          sub: "power at fixture",
          circuitId: circuit.id,
        });
        edges.push({ from: prev, to: fixtureId, cable: circuit.cable, label: "feed" });
        edges.push({ from: fixtureId, to: deviceNodeId, cable: inCable.type, label: inSpec.label.toLowerCase() });
      } else if (inSpec && inCable && prevIsBreaker && /switch/i.test(inSpec.toward)) {
        const switchId = `fx-${device.id}-in`;
        nodes.push({
          id: switchId,
          kind: "fixture",
          label: "Wall switch",
          sub: "feeds this receptacle",
          circuitId: circuit.id,
        });
        edges.push({ from: prev, to: switchId, cable: circuit.cable, label: "feed" });
        edges.push({ from: switchId, to: deviceNodeId, cable: inCable.type, label: inSpec.label.toLowerCase() });
      } else if (inCable) {
        edges.push({ from: prev, to: deviceNodeId, cable: inCable.type, label: inSpec?.label.toLowerCase() ?? "feed" });
      }

      // Unmodeled light at the end of a final out-leg.
      for (const outSpec of config?.cables.filter((c) => c.direction === "out") ?? []) {
        if (!isLast || !/light$/i.test(outSpec.toward)) continue;
        const outCable = plan.cables.find((c) => c.role === outSpec.role);
        if (!outCable) continue;
        const fixtureId = `fx-${device.id}-out`;
        nodes.push({
          id: fixtureId,
          kind: "fixture",
          label: "Light fixture",
          circuitId: circuit.id,
        });
        edges.push({ from: deviceNodeId, to: fixtureId, cable: outCable.type, label: outSpec.label.toLowerCase() });
      }

      prev = deviceNodeId;
    }
  }

  return { nodes, edges };
}
