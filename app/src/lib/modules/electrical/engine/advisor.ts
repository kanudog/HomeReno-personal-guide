import type {
  AdvisorInput,
  AdvisorResult,
  AdvisorScenario,
  AdvisorScenarioCircuit,
} from "../types";
import { minAwgForBreaker } from "../data/conductors";
import { sumLoads } from "./circuitLoad";

interface LoadUnit {
  loadId: string;
  name: string;
  va: number;
  continuous: boolean;
  /** Placement weight: continuous units at 125%. */
  weight: number;
}

const titleNumber = ["", "One", "Two", "Three", "Four"] as const;

/**
 * "One breaker or two?" — evaluate every (circuit count × breaker size)
 * scenario for a set of loads. Deterministic: units sorted heaviest-first,
 * greedy-assigned to the lightest circuit (ties → lowest index).
 */
export function runAdvisor(input: AdvisorInput): AdvisorResult {
  const volts = input.volts ?? 120;
  const ampsOptions = [...(input.breakerAmpsOptions ?? [15, 20])].sort((a, b) => a - b);
  const maxCircuits = Math.min(input.maxCircuits ?? 2, 4);

  const units: LoadUnit[] = [];
  for (const load of input.loads) {
    for (let i = 0; i < load.qty; i++) {
      units.push({
        loadId: load.id,
        name: load.name,
        va: load.va,
        continuous: load.continuous,
        weight: load.continuous ? Math.ceil(load.va * 1.25) : load.va,
      });
    }
  }
  units.sort((a, b) => b.weight - a.weight || a.loadId.localeCompare(b.loadId));

  const totals = sumLoads(input.loads);
  const scenarios: AdvisorScenario[] = [];

  for (let k = 1; k <= maxCircuits; k++) {
    for (const amps of ampsOptions) {
      const buckets: LoadUnit[][] = Array.from({ length: k }, () => []);
      const weights = new Array<number>(k).fill(0);
      for (const u of units) {
        let target = 0;
        for (let i = 1; i < k; i++) if (weights[i]! < weights[target]!) target = i;
        buckets[target]!.push(u);
        weights[target]! += u.weight;
      }

      const capacityVa = volts * amps;
      const circuits: AdvisorScenarioCircuit[] = buckets.map((bucket) => {
        const asLoads = bucket.map((u) => ({
          id: u.loadId,
          name: u.name,
          va: u.va,
          qty: 1,
          continuous: u.continuous,
        }));
        const sums = sumLoads(asLoads);
        const counts = new Map<string, { name: string; n: number }>();
        for (const u of bucket) {
          const e = counts.get(u.loadId) ?? { name: u.name, n: 0 };
          e.n += 1;
          counts.set(u.loadId, e);
        }
        return {
          breakerAmps: amps,
          minAwg: minAwgForBreaker(amps) ?? 14,
          assignedLoadIds: bucket.map((u) => u.loadId),
          assignedSummary:
            [...counts.values()].map((e) => (e.n > 1 ? `${e.name} ×${e.n}` : e.name)).join(", ") ||
            "(nothing)",
          connectedVa: sums.connectedVa,
          adjustedVa: sums.adjustedVa,
          capacityVa,
          pctOfCapacity: Math.round((sums.adjustedVa / capacityVa) * 100),
          pass: sums.adjustedVa <= capacityVa,
        };
      });

      scenarios.push({
        id: `${k}x${amps}`,
        title: `${titleNumber[k]} ${amps}A circuit${k > 1 ? "s" : ""}`,
        circuits,
        pass: circuits.every((c) => c.pass),
        minHeadroomVa: Math.min(...circuits.map((c) => c.capacityVa - c.adjustedVa)),
      });
    }
  }

  const recommended = scenarios.find((s) => s.pass) ?? null;

  const notes: string[] = [];
  if (totals.continuousVa > 0) {
    notes.push(
      `Loads that run 3+ hours (${totals.continuousVa} VA of the ${totals.connectedVa} VA total) are "continuous" — the code sizes them at 125%, which is why the adjusted total is ${totals.adjustedVa} VA.`,
    );
  }
  if (recommended && recommended.circuits.length > 1) {
    notes.push(
      "A split means a second breaker slot and a second home run of cable — but each circuit gains real headroom, and one tripped breaker no longer takes down the whole room.",
    );
  }
  if (!recommended) {
    notes.push(
      `Nothing passes at up to ${maxCircuits} circuits of ${ampsOptions[ampsOptions.length - 1]}A — shed load, add circuits, or move the biggest equipment to a 240V circuit.`,
    );
  }

  return {
    totalConnectedVa: totals.connectedVa,
    totalAdjustedVa: totals.adjustedVa,
    scenarios,
    recommendedId: recommended?.id ?? null,
    notes,
  };
}
