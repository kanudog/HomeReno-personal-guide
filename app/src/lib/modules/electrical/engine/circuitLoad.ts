import type { ApplianceLoad, CircuitInput, CircuitLoadResult } from "../types";

export const circuitVolts = (c: Pick<CircuitInput, "poles">): number =>
  c.poles === 2 ? 240 : 120;

export function sumLoads(loads: ApplianceLoad[]): {
  connectedVa: number;
  continuousVa: number;
  adjustedVa: number;
} {
  let connectedVa = 0;
  let continuousVa = 0;
  for (const l of loads) {
    const va = l.va * l.qty;
    connectedVa += va;
    if (l.continuous) continuousVa += va;
  }
  // Continuous loads count at 125% (NEC 210.19(A)/210.20(A)); ceil keeps integers.
  const adjustedVa = Math.ceil(continuousVa * 1.25) + (connectedVa - continuousVa);
  return { connectedVa, continuousVa, adjustedVa };
}

/** Per-circuit connected load vs breaker capacity. */
export function computeCircuitLoads(circuits: CircuitInput[]): CircuitLoadResult[] {
  return circuits.map((c) => {
    const volts = circuitVolts(c);
    const capacityVa = volts * c.breakerAmps;
    const { connectedVa, continuousVa, adjustedVa } = sumLoads(c.loads);
    return {
      circuitId: c.id,
      volts,
      breakerAmps: c.breakerAmps,
      capacityVa,
      connectedVa,
      continuousVa,
      adjustedVa,
      pctOfCapacity: capacityVa === 0 ? 0 : Math.round((adjustedVa / capacityVa) * 100),
      pass: adjustedVa <= capacityVa,
    };
  });
}
