import type {
  CableType,
  DeviceKind,
  DevicePlan,
  ElectricalInput,
  ShoppingLine,
} from "../types";
import { deviceConfig, deviceSpec } from "../data/devices";
import { boxById } from "../data/boxes";
import {
  BREAKER_PRICES_CENTS,
  CABLE_SPOOL_PRICES_CENTS,
  CABLE_SPOOL_SIZES_FT,
  GFCI_LABELS_PRICE_CENTS,
  STAPLE_BOX,
  WALL_PLATE_PRICES_CENTS,
  WIRE_NUT_PACK,
} from "../data/prices";

const search = (q: string) => encodeURIComponent(q);
const hd = (q: string) => `https://www.homedepot.com/s/${search(q)}`;
const lowes = (q: string) => `https://www.lowes.com/search?searchTerm=${search(q)}`;

const RECEPTACLE_KINDS: DeviceKind[] = [
  "receptacle-duplex",
  "receptacle-gfci",
  "receptacle-switched",
];

const MAKEUP_FT = 2; // slack per box for stripping and free conductor
const WASTE_FACTOR = 1.1;

/**
 * Cable purchase counts each segment once: every cable arriving at a device
 * ("in"), plus legs leaving toward unmodeled fixtures ("out" toward a light).
 * "Onward" cables to the next device are that device's feed — not recounted.
 */
function countsForPurchase(direction: "in" | "out", toward: string): boolean {
  return direction === "in" || /light/i.test(toward);
}

/** Buy spools greedily: 250s while needed, then the smallest that covers. */
function spoolsFor(neededFt: number): number[] {
  const spools: number[] = [];
  let rest = neededFt;
  const largest = CABLE_SPOOL_SIZES_FT[CABLE_SPOOL_SIZES_FT.length - 1]!;
  while (rest > largest) {
    spools.push(largest);
    rest -= largest;
  }
  const cover = CABLE_SPOOL_SIZES_FT.find((s) => s >= rest) ?? largest;
  spools.push(cover);
  return spools;
}

export function generateShopping(
  input: ElectricalInput,
  plans: DevicePlan[],
): ShoppingLine[] {
  const lines: ShoppingLine[] = [];
  const deviceById = new Map(
    input.circuits.flatMap((c) => c.devices.map((d) => [d.id, d] as const)),
  );
  const circuitById = new Map(input.circuits.map((c) => [c.id, c]));

  // ---- cable ---------------------------------------------------------------
  const cableFt = new Map<CableType, number>();
  for (const plan of plans) {
    // Existing boxes already have their cable in the wall.
    if (deviceById.get(plan.deviceId)?.workType === "existing-box") continue;
    const config = deviceConfig(plan.kind, plan.configId);
    if (!config) continue;
    for (const spec of config.cables) {
      if (!countsForPurchase(spec.direction, spec.toward)) continue;
      const cable = plan.cables.find((c) => c.role === spec.role);
      if (!cable) continue;
      cableFt.set(cable.type, (cableFt.get(cable.type) ?? 0) + cable.lengthFt + MAKEUP_FT);
    }
  }
  let totalCableFt = 0;
  for (const [type, rawFt] of [...cableFt.entries()].sort()) {
    const needFt = Math.ceil(rawFt * WASTE_FACTOR);
    totalCableFt += needFt;
    const bySize = new Map<number, number>();
    for (const s of spoolsFor(needFt)) bySize.set(s, (bySize.get(s) ?? 0) + 1);
    for (const [size, qty] of [...bySize.entries()].sort((a, b) => a[0] - b[0])) {
      lines.push({
        id: `cable-${type.replace("/", "-")}-${size}`,
        description: `${type} NM-B cable, ${size} ft (~${needFt} ft needed)`,
        qty,
        unit: "spool",
        unitCostCents: CABLE_SPOOL_PRICES_CENTS[type][size] ?? 0,
        homeDepotUrl: hd(`${type} NM-B wire ${size} ft`),
        lowesUrl: lowes(`${type} NM-B wire ${size} ft`),
      });
    }
  }

  // ---- devices ---------------------------------------------------------------
  const deviceCounts = new Map<string, { kind: DeviceKind; rating: number; qty: number }>();
  for (const plan of plans) {
    const circuit = circuitById.get(plan.circuitId);
    if (!circuit) continue;
    const isReceptacle = RECEPTACLE_KINDS.includes(plan.kind);
    const receptaclesOnCircuit = circuit.devices.filter((d) =>
      RECEPTACLE_KINDS.includes(d.kind),
    ).length;
    // A single receptacle on an individual 20A circuit must be 20A-rated
    // (NEC 210.21(B)); multi-receptacle 20A circuits may use 15A devices.
    const rating = isReceptacle && receptaclesOnCircuit === 1 ? circuit.breakerAmps : 15;
    const spec = deviceSpec(plan.kind);
    const safeRating = spec && spec.priceCentsByRating[rating] !== undefined ? rating : 15;
    const key = `${plan.kind}|${safeRating}`;
    const entry = deviceCounts.get(key) ?? { kind: plan.kind, rating: safeRating, qty: 0 };
    entry.qty += 1;
    deviceCounts.set(key, entry);
  }
  for (const [key, entry] of [...deviceCounts.entries()].sort()) {
    const spec = deviceSpec(entry.kind);
    if (!spec) continue;
    const tr = RECEPTACLE_KINDS.includes(entry.kind) ? " TR" : "";
    lines.push({
      id: `device-${key.replace("|", "-")}`,
      description: `${spec.label}, ${entry.rating}A${tr}`,
      qty: entry.qty,
      unit: "ea",
      unitCostCents: spec.priceCentsByRating[entry.rating] ?? 0,
      homeDepotUrl: hd(`${entry.rating} amp ${spec.shoppingQuery}`),
      lowesUrl: lowes(`${entry.rating} amp ${spec.shoppingQuery}`),
    });
  }

  // ---- boxes (not needed where the box is already in the wall) ----------------
  const boxCounts = new Map<string, number>();
  let newWorkBoxes = 0;
  for (const plan of plans) {
    const device = deviceById.get(plan.deviceId);
    if (!device || device.workType === "existing-box") continue;
    boxCounts.set(plan.boxFill.boxId, (boxCounts.get(plan.boxFill.boxId) ?? 0) + 1);
    if (device.workType === "new-work") newWorkBoxes += 1;
  }
  for (const [boxId, qty] of [...boxCounts.entries()].sort()) {
    const box = boxById(boxId);
    if (!box) continue;
    lines.push({
      id: `box-${boxId}`,
      description: box.label,
      qty,
      unit: "ea",
      unitCostCents: box.priceCents,
      homeDepotUrl: hd(box.shoppingQuery),
      lowesUrl: lowes(box.shoppingQuery),
    });
  }

  // ---- wall plates -------------------------------------------------------------
  const plateCounts = new Map<"duplex" | "decora" | "toggle", number>();
  for (const plan of plans) {
    const plate = deviceSpec(plan.kind)?.plate;
    if (plate) plateCounts.set(plate, (plateCounts.get(plate) ?? 0) + 1);
  }
  for (const [plate, qty] of [...plateCounts.entries()].sort()) {
    lines.push({
      id: `plate-${plate}`,
      description: `Wall plate, ${plate}`,
      qty,
      unit: "ea",
      unitCostCents: WALL_PLATE_PRICES_CENTS[plate],
      homeDepotUrl: hd(`${plate} wall plate 1 gang`),
      lowesUrl: lowes(`${plate} wall plate 1 gang`),
    });
  }

  // ---- wire nuts + staples --------------------------------------------------------
  const nutCount = plans.reduce((n, p) => n + p.wirenuts.length, 0);
  if (nutCount > 0) {
    lines.push({
      id: "wire-nuts",
      description: `Wire nut assortment (~${nutCount} splices)`,
      qty: Math.max(1, Math.ceil(nutCount / WIRE_NUT_PACK.count)),
      unit: "pack",
      unitCostCents: WIRE_NUT_PACK.priceCents,
      homeDepotUrl: hd("wire nut assortment"),
      lowesUrl: lowes("wire connectors assortment"),
    });
  }
  if (totalCableFt > 0 && newWorkBoxes > 0) {
    const staples = Math.ceil(totalCableFt / 4) + newWorkBoxes * 2;
    lines.push({
      id: "staples",
      description: `NM cable staples (~${staples} needed)`,
      qty: Math.max(1, Math.ceil(staples / STAPLE_BOX.count)),
      unit: "box",
      unitCostCents: STAPLE_BOX.priceCents,
      homeDepotUrl: hd("nm cable staples"),
      lowesUrl: lowes("romex staples"),
    });
  }

  // ---- breakers (new circuits only) ------------------------------------------------
  const breakerCounts = new Map<string, { amps: number; poles: 1 | 2; type: string; qty: number }>();
  for (const c of input.circuits) {
    if (c.existing) continue;
    const key = `${c.breakerAmps}|${c.poles}|${c.breakerType}`;
    const entry =
      breakerCounts.get(key) ?? { amps: c.breakerAmps, poles: c.poles, type: c.breakerType, qty: 0 };
    entry.qty += 1;
    breakerCounts.set(key, entry);
  }
  for (const [key, b] of [...breakerCounts.entries()].sort()) {
    const base = BREAKER_PRICES_CENTS[b.type as keyof typeof BREAKER_PRICES_CENTS] ?? 899;
    const typeTag = b.type === "standard" ? "" : ` ${b.type.toUpperCase()}`;
    lines.push({
      id: `breaker-${key.replace(/\|/g, "-")}`,
      description: `${b.amps}A ${b.poles === 2 ? "2-pole " : ""}breaker${typeTag} (match your panel brand!)`,
      qty: b.qty,
      unit: "ea",
      unitCostCents: b.poles === 2 ? Math.round(base * 2.2) : base,
      homeDepotUrl: hd(`${b.amps} amp ${b.poles === 2 ? "2 pole " : ""}${b.type} breaker`),
      lowesUrl: lowes(`${b.amps} amp ${b.poles === 2 ? "2 pole " : ""}${b.type} breaker`),
    });
  }

  // ---- GFCI-protected stickers -------------------------------------------------------
  if (plans.some((p) => p.configId === "line-load")) {
    lines.push({
      id: "gfci-labels",
      description: '"GFCI Protected" labels for downstream receptacles',
      qty: 1,
      unit: "sheet",
      unitCostCents: GFCI_LABELS_PRICE_CENTS,
      homeDepotUrl: hd("gfci protected labels"),
      lowesUrl: lowes("gfci protected labels"),
    });
  }

  return lines;
}
