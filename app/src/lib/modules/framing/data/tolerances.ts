import { inches, type Sixteenths } from "@/lib/units";

/**
 * Standard rough-opening tolerances. All editable — these are the
 * defaults the engine applies when the user enters unit dimensions.
 */
export interface ROTolerances {
  /** Added to each dimension of a window unit. */
  windowExtraWidth: Sixteenths;
  windowExtraHeight: Sixteenths;
  /** Added to a prehung door slab width (jambs + shim space). */
  doorExtraWidth: Sixteenths;
  /** Added to a door slab height (jamb head + threshold + shim). */
  doorExtraHeight: Sixteenths;
}

export const DEFAULT_TOLERANCES: ROTolerances = {
  windowExtraWidth: inches(0.5),
  windowExtraHeight: inches(0.5),
  doorExtraWidth: inches(2),
  doorExtraHeight: inches(2.5),
};
