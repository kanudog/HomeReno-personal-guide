import type {
  CircuitInput,
  CircuitLoadResult,
  DeviceKind,
  ElectricalInput,
  ElectricalWarning,
  RoomFacts,
  RoomType,
} from "../types";
import { CABLES, MAX_BREAKER_BY_AWG } from "../data/conductors";
import { deviceConfig } from "../data/devices";

const RECEPTACLE_KINDS: DeviceKind[] = [
  "receptacle-duplex",
  "receptacle-gfci",
  "receptacle-switched",
];

/** Receptacles that need protection from elsewhere (a GFCI protects itself). */
const GFCI_NEEDING_KINDS: DeviceKind[] = ["receptacle-duplex", "receptacle-switched"];

const GFCI_ROOM_TYPES: RoomType[] = [
  "laundry",
  "kitchen",
  "bathroom",
  "garage",
  "outdoor",
  "basement-finished",
  "basement-unfinished",
];

/** 210.52(A) spacing applies to habitable rooms. */
const SPACING_ROOM_TYPES: RoomType[] = ["bedroom", "living", "kitchen", "basement-finished"];

const SIXTEENTHS_PER_FOOT = 192;
const ftCeil = (sixteenths: number, feet: number) =>
  Math.ceil(sixteenths / (feet * SIXTEENTHS_PER_FOOT));

function roomOf(device: { roomId?: string }, circuit: CircuitInput, rooms: RoomFacts[]) {
  const id = device.roomId ?? circuit.roomId;
  return rooms.find((r) => r.id === id);
}

export function validateDesign(
  input: ElectricalInput,
  circuitLoads: CircuitLoadResult[],
): ElectricalWarning[] {
  const warnings: ElectricalWarning[] = [];
  const { circuits, rooms, panel } = input;

  // ---- circuit-level: gauge vs breaker -------------------------------------
  for (const c of circuits) {
    const awg = CABLES[c.cable].awg;
    const maxAmps = MAX_BREAKER_BY_AWG[awg];
    if (c.breakerAmps > maxAmps) {
      warnings.push({
        code: "gauge-breaker-mismatch",
        severity: "danger",
        message: `${c.name}: ${awg} AWG cable allows at most a ${maxAmps}A breaker — a ${c.breakerAmps}A breaker won't protect this wire`,
        circuitId: c.id,
      });
    }
  }

  // ---- device configs: position + new-work legality ------------------------
  for (const c of circuits) {
    for (const d of c.devices) {
      const config = deviceConfig(d.kind, d.config);
      if (!config) continue; // unknown kind/config warned by the plan builder
      if (!config.validPositions.includes(d.position)) {
        warnings.push({
          code: "invalid-device-config",
          severity: "warn",
          message: `${c.name}: "${config.label}" is a ${config.validPositions.join("/")} configuration, but the device is marked ${d.position}`,
          circuitId: c.id,
          deviceId: d.id,
        });
      }
      if (!config.newWorkOk && d.workType === "new-work") {
        warnings.push({
          code: "config-not-for-new-work",
          severity: "warn",
          message: `${c.name}: "${config.label}" is only allowed in existing wiring — new runs need a neutral at the switch (NEC 404.2(C)); use the x/3 loop instead`,
          circuitId: c.id,
          deviceId: d.id,
        });
      }
    }

    const firsts = c.devices.filter(
      (d) => d.kind === "switch-3way" && d.config === "power-in-first",
    ).length;
    const lasts = c.devices.filter(
      (d) => d.kind === "switch-3way" && d.config === "light-out-last",
    ).length;
    if (firsts !== lasts) {
      warnings.push({
        code: "three-way-unpaired",
        severity: "warn",
        message: `${c.name}: 3-way switches come in pairs — found ${firsts} "power in" and ${lasts} "light out"`,
        circuitId: c.id,
      });
    }
  }

  // ---- GFCI zones -----------------------------------------------------------
  for (const c of circuits) {
    const breakerProtects = c.breakerType === "gfci" || c.breakerType === "dual-function";
    let upstreamProtected = false;
    for (const d of c.devices) {
      const room = roomOf(d, c, rooms);
      if (
        room &&
        GFCI_ROOM_TYPES.includes(room.type) &&
        GFCI_NEEDING_KINDS.includes(d.kind) &&
        !breakerProtects &&
        !upstreamProtected
      ) {
        warnings.push({
          code: "gfci-required",
          severity: "warn",
          message: `${c.name}: the receptacle in ${room.name} needs GFCI protection (NEC 210.8) — use a GFCI receptacle, put it downstream of a GFCI's LOAD side, or use a GFCI breaker`,
          circuitId: c.id,
          deviceId: d.id,
          roomId: room.id,
        });
      }
      if (d.kind === "receptacle-gfci" && d.config === "line-load") upstreamProtected = true;
    }
  }

  // ---- AFCI (NC amendment: bedrooms) ----------------------------------------
  for (const c of circuits) {
    const servesBedroom =
      rooms.some((r) => r.id === c.roomId && r.type === "bedroom") ||
      c.devices.some((d) => {
        const room = roomOf(d, c, rooms);
        return room?.type === "bedroom";
      });
    if (servesBedroom && c.breakerType !== "afci" && c.breakerType !== "dual-function") {
      warnings.push({
        code: "afci-required",
        severity: "warn",
        message: `${c.name}: bedroom outlets need AFCI protection (NEC 210.12 as amended by NC) — use an AFCI or dual-function breaker`,
        circuitId: c.id,
      });
    }
  }

  // ---- tamper-resistant (one note per design) --------------------------------
  if (circuits.some((c) => c.devices.some((d) => RECEPTACLE_KINDS.includes(d.kind)))) {
    warnings.push({
      code: "tamper-resistant-required",
      severity: "info",
      message:
        "Dwelling receptacles must be tamper-resistant (NEC 406.12) — the shopping list specifies TR devices",
    });
  }

  // ---- room rules ------------------------------------------------------------
  for (const room of rooms) {
    const circuitsServing = circuits.filter(
      (c) => c.roomId === room.id || c.devices.some((d) => (d.roomId ?? c.roomId) === room.id),
    );
    const receptaclesInRoom = circuits.flatMap((c) =>
      c.devices.filter(
        (d) => RECEPTACLE_KINDS.includes(d.kind) && (d.roomId ?? c.roomId) === room.id,
      ),
    );

    if (room.type === "laundry" || room.type === "bathroom" || room.type === "garage") {
      if (receptaclesInRoom.length === 0 && circuitsServing.length > 0) {
        warnings.push({
          code: "room-receptacle-required",
          severity: "warn",
          message: `${room.name}: a ${room.type} requires at least one receptacle (NEC 210.52)`,
          roomId: room.id,
        });
      }
    }

    if ((room.type === "laundry" || room.type === "bathroom") && receptaclesInRoom.length > 0) {
      for (const c of circuitsServing) {
        const hasReceptacleHere = c.devices.some(
          (d) => RECEPTACLE_KINDS.includes(d.kind) && (d.roomId ?? c.roomId) === room.id,
        );
        if (!hasReceptacleHere) continue;
        const ref = room.type === "laundry" ? "NEC 210.11(C)(2)" : "NEC 210.11(C)(3)";
        if (c.breakerAmps !== 20) {
          warnings.push({
            code: "dedicated-circuit-required",
            severity: "warn",
            message: `${c.name}: ${room.type} receptacles require a dedicated 20A circuit (${ref}) — this one is ${c.breakerAmps}A`,
            circuitId: c.id,
            roomId: room.id,
          });
        }
        const servesElsewhere = c.devices.some((d) => (d.roomId ?? c.roomId) !== room.id);
        if (servesElsewhere) {
          warnings.push({
            code: "dedicated-circuit-required",
            severity: "warn",
            message: `${c.name}: the ${room.type} circuit must serve only the ${room.type} area (${ref}) — this one also feeds other rooms`,
            circuitId: c.id,
            roomId: room.id,
          });
        }
      }
    }

    if (SPACING_ROOM_TYPES.includes(room.type) && circuitsServing.length > 0) {
      const needed = room.wallLengths
        .filter((w) => (w as number) >= 2 * SIXTEENTHS_PER_FOOT)
        .reduce((n, w) => n + ftCeil(w as number, 12), 0);
      const have = receptaclesInRoom.filter((d) => d.location !== "counter").length;
      if (have < needed) {
        warnings.push({
          code: "receptacle-spacing",
          severity: "warn",
          message: `${room.name}: wall receptacle spacing (NEC 210.52(A), 6'/12' rule) needs about ${needed} receptacle${needed === 1 ? "" : "s"} for these wall lengths — the design has ${have}`,
          roomId: room.id,
        });
      }
    }

    if (room.type === "kitchen" && (room.counterRunLengths?.length ?? 0) > 0) {
      const needed = (room.counterRunLengths ?? [])
        .filter((w) => (w as number) >= 12 * 16)
        .reduce((n, w) => n + ftCeil(w as number, 4), 0);
      const have = receptaclesInRoom.filter((d) => d.location === "counter").length;
      if (have < needed && circuitsServing.length > 0) {
        warnings.push({
          code: "counter-receptacle-spacing",
          severity: "warn",
          message: `${room.name}: counter runs need about ${needed} receptacle${needed === 1 ? "" : "s"} (no point more than 24" from one, NEC 210.52(C)) — the design has ${have}`,
          roomId: room.id,
        });
      }
    }
  }

  // ---- panel slots -----------------------------------------------------------
  const occupied = new Map<number, string>();
  for (const e of panel.existing ?? []) {
    occupied.set(e.slot, e.label);
    if (e.poles === 2) occupied.set(e.slot + 2, e.label);
  }
  for (const c of circuits) {
    if (c.slot === undefined) continue;
    const slots = c.poles === 2 ? [c.slot, c.slot + 2] : [c.slot];
    for (const s of slots) {
      const takenBy = occupied.get(s);
      if (takenBy !== undefined && !(c.existing && takenBy === c.name)) {
        warnings.push({
          code: "panel-slot-conflict",
          severity: "danger",
          message: `${c.name}: panel slot ${s} is already taken by "${takenBy}"`,
          circuitId: c.id,
        });
      }
      occupied.set(s, c.name);
      if (s > panel.slots) {
        warnings.push({
          code: "panel-slots-exceeded",
          severity: "warn",
          message: `${c.name}: slot ${s} doesn't exist in a ${panel.slots}-space panel`,
          circuitId: c.id,
        });
      }
    }
  }

  // ---- connected load vs capacity ---------------------------------------------
  for (const load of circuitLoads) {
    if (!load.pass) {
      const c = circuits.find((x) => x.id === load.circuitId);
      warnings.push({
        code: "load-exceeds-capacity",
        severity: "danger",
        message: `${c?.name ?? load.circuitId}: adjusted load ${load.adjustedVa} VA exceeds the ${load.breakerAmps}A breaker's ${load.capacityVa} VA — see the advisor for a split`,
        circuitId: load.circuitId,
      });
    }
  }

  return warnings;
}
