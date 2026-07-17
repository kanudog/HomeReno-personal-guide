import type {
  Awg,
  CableType,
  CircuitInput,
  ConductorRole,
  DeviceInput,
  DevicePlan,
  ElectricalWarning,
  ResolvedCable,
  ResolvedConductor,
  ResolvedConnection,
  WireNutSpec,
} from "../types";
import { CABLES, pickWireNut } from "../data/conductors";
import { boxById } from "../data/boxes";
import { deviceConfig, deviceSpec, type CableRoleSpec } from "../data/devices";
import { computeBoxFill, pickBox, type BoxFillParams } from "./boxFill";

export const DEFAULT_SEGMENT_FT = 15;

/** The x/2 or x/3 sibling of the circuit's cable at the same gauge. */
export function cableForRole(circuitCable: CableType, wires: 2 | 3): CableType {
  const awg = CABLES[circuitCable].awg;
  return `${awg}/${wires}` as CableType;
}

function conductorRole(
  cable: CableRoleSpec,
  color: string,
  target: { terminalId?: string; capped?: boolean; reidentified?: boolean },
): ConductorRole {
  if (color === "bare") return "ground";
  if (color === "white") {
    if (target.capped) return "spare";
    if (target.reidentified) return "hot";
    return "neutral";
  }
  if (target.terminalId === "t-a" || target.terminalId === "t-b") return "traveler";
  // A conductor leaving toward the light on the COMMON screw is the switched hot.
  if (target.terminalId === "common" && cable.direction === "out") return "switched";
  if (color === "red") return "switched";
  return "hot";
}

/**
 * Instantiate one device against the catalog: concrete conductors, wire
 * nuts, ordered connection steps, and box fill. Pure and deterministic.
 */
export function buildDevicePlan(
  circuit: CircuitInput,
  device: DeviceInput,
  displayName: string,
): { plan: DevicePlan | null; warnings: ElectricalWarning[] } {
  const warnings: ElectricalWarning[] = [];
  const spec = deviceSpec(device.kind);
  const config = spec ? deviceConfig(device.kind, device.config) : undefined;

  if (!spec || !config) {
    warnings.push({
      code: "invalid-device-config",
      severity: "danger",
      message: `${displayName}: unknown ${spec ? `configuration "${device.config}"` : `device kind "${device.kind}"`}`,
      circuitId: circuit.id,
      deviceId: device.id,
    });
    return { plan: null, warnings };
  }

  const awg = CABLES[circuit.cable].awg;

  // ---- resolve cables + conductors ----------------------------------------
  const cables: ResolvedCable[] = config.cables.map((c) => {
    const type = cableForRole(circuit.cable, c.wires);
    const conductors: ResolvedConductor[] = [...CABLES[type].insulated, "bare" as const].map(
      (color) => ({
        id: `${device.id}.${c.role}.${color}`,
        cableRole: c.role,
        color,
        role: "hot", // refined below once targets are known
        awg,
      }),
    );
    return {
      role: c.role,
      label: `${c.label} — ${type} NM-B (${c.toward})`,
      type,
      conductors,
      lengthFt: c.role === "feed" || c.role === "loop" ? (device.feedLengthFt ?? DEFAULT_SEGMENT_FT) : DEFAULT_SEGMENT_FT,
    };
  });

  const conductorById = new Map<string, ResolvedConductor>();
  for (const c of cables) for (const w of c.conductors) conductorById.set(w.id, w);
  const cableSpecByRole = new Map(config.cables.map((c) => [c.role, c]));

  // ---- walk the steps: wire nuts + connections -----------------------------
  const wirenuts: WireNutSpec[] = [];
  const connections: ResolvedConnection[] = [];
  const terminalLabel = (terminalId: string) =>
    spec.terminals.find((t) => t.id === terminalId)?.label ?? terminalId;

  config.steps.forEach((step, index) => {
    const conductorIds = step.take.map((t) => `${device.id}.${t.cableRole}.${t.color}`);

    for (const t of step.take) {
      const wire = conductorById.get(`${device.id}.${t.cableRole}.${t.color}`);
      const roleSpec = cableSpecByRole.get(t.cableRole);
      if (!wire || !roleSpec) {
        warnings.push({
          code: "invalid-device-config",
          severity: "danger",
          message: `${displayName}: catalog step references missing conductor ${t.cableRole}.${t.color}`,
          circuitId: circuit.id,
          deviceId: device.id,
        });
        continue;
      }
      if (step.reidentify) wire.reidentifiedTo = step.reidentify;
      wire.role = conductorRole(roleSpec, t.color, {
        terminalId: step.target.kind === "terminal" ? step.target.terminalId : undefined,
        capped: step.target.kind === "cap",
        reidentified: !!step.reidentify,
      });
    }

    if (step.target.kind === "terminal") {
      connections.push({
        step: index,
        conductorIds,
        target: {
          kind: "terminal",
          terminalId: step.target.terminalId,
          terminalLabel: terminalLabel(step.target.terminalId),
        },
        instruction: step.instruction,
      });
      return;
    }

    if (step.target.kind === "prep") {
      connections.push({ step: index, conductorIds, target: { kind: "prep" }, instruction: step.instruction });
      return;
    }

    // splice / cap → wire nut
    const wirenutId = `${device.id}.WN-${step.target.group}`;
    const pigtailTo = step.target.kind === "splice" ? step.target.pigtailTo : undefined;
    const memberCount = conductorIds.length + (pigtailTo ? 1 : 0);
    const size = pickWireNut(memberCount, awg);
    if (size === null) {
      warnings.push({
        code: "wirenut-overfilled",
        severity: "warn",
        message: `${displayName}: ${memberCount} × ${awg} AWG exceeds the listed wire-nut sizes — use a lever connector (Wago 221) or split the splice`,
        circuitId: circuit.id,
        deviceId: device.id,
      });
    }
    wirenuts.push({
      id: wirenutId,
      size: size ?? "lever connector",
      conductorIds,
      pigtail: pigtailTo
        ? {
            color: (conductorById.get(conductorIds[0]!)?.color ?? "black"),
            toTerminalId: pigtailTo,
          }
        : undefined,
    });
    connections.push({
      step: index,
      conductorIds,
      target: { kind: "wirenut", wirenutId },
      instruction: step.instruction,
    });
  });

  // ---- box selection + fill -------------------------------------------------
  const insulatedCount = cables.reduce((n, c) => n + (CABLES[c.type].insulated.length), 0);
  const fillParams: BoxFillParams = {
    insulatedByAwg: { [awg]: insulatedCount } as Partial<Record<Awg, number>>,
    egcCount: cables.length,
    egcAwg: awg,
    deviceYokes: spec.yokes,
    deviceAwg: awg,
    clamps: false, // per-box; set by computeBoxFill/pickBox from the BoxSpec
  };

  let boxFill;
  if (device.boxId) {
    const box = boxById(device.boxId);
    if (!box) {
      warnings.push({
        code: "invalid-device-config",
        severity: "warn",
        message: `${displayName}: unknown box "${device.boxId}" — auto-picking instead`,
        circuitId: circuit.id,
        deviceId: device.id,
      });
      boxFill = pickBox(fillParams, device.workType).result;
    } else {
      boxFill = computeBoxFill({ ...fillParams, clamps: box.hasClamps }, box);
    }
  } else {
    boxFill = pickBox(fillParams, device.workType).result;
  }

  if (!boxFill.pass) {
    warnings.push({
      code: "box-fill-exceeded",
      severity: "danger",
      message: `${displayName}: box fill ${(boxFill.totalFill as number) / 4} in³ exceeds the ${(boxFill.capacity as number) / 4} in³ box${boxFill.suggestedBoxId ? ` — use ${boxById(boxFill.suggestedBoxId)?.label}` : ""}`,
      circuitId: circuit.id,
      deviceId: device.id,
    });
  }

  const plan: DevicePlan = {
    deviceId: device.id,
    circuitId: circuit.id,
    kind: device.kind,
    configId: config.id,
    displayName,
    configLabel: config.label,
    cables,
    wirenuts,
    connections,
    boxFill,
    notes: config.notes ?? [],
  };
  return { plan, warnings };
}
