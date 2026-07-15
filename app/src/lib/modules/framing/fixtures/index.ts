import { inches } from "@/lib/units";
import type { WallInput } from "../types";

/**
 * Golden-test walls, shared by unit tests and the /dev/gallery page.
 * Expected values in the tests are hand-verified against these.
 */
export const FIXTURES: Record<string, WallInput> = {
  /** 8' wall, 8' ceiling height, no openings. */
  "plain-8ft": {
    length: inches(96),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: false,
    bottomPlatePT: true,
    openings: [],
  },

  /** 8' load-bearing wall with a 36" × 80" prehung door. */
  "door-8ft": {
    length: inches(96),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: true,
    bottomPlatePT: true,
    openings: [
      {
        id: "door-1",
        kind: "door",
        offset: inches(30),
        unitWidth: inches(36),
        unitHeight: inches(80),
      },
    ],
  },

  /** 12' load-bearing wall with a 36" × 48" window, sill at 36". */
  "window-12ft": {
    length: inches(144),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: true,
    bottomPlatePT: true,
    openings: [
      {
        id: "win-1",
        kind: "window",
        offset: inches(60),
        unitWidth: inches(36),
        unitHeight: inches(48),
        sillHeight: inches(36),
      },
    ],
  },

  /** 16' wall with a door and a window. */
  "door-and-window-16ft": {
    length: inches(192),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: true,
    bottomPlatePT: true,
    openings: [
      {
        id: "door-1",
        kind: "door",
        offset: inches(24),
        unitWidth: inches(32),
        unitHeight: inches(80),
      },
      {
        id: "win-1",
        kind: "window",
        offset: inches(120),
        unitWidth: inches(48),
        unitHeight: inches(36),
        sillHeight: inches(42),
      },
    ],
  },

  /** 10' non-load-bearing partition at 24" OC, single top plate. */
  "partition-24oc": {
    length: inches(120),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(24),
    topPlate: "single",
    loadBearing: false,
    bottomPlatePT: true,
    openings: [
      {
        id: "door-1",
        kind: "door",
        offset: inches(40),
        unitWidth: inches(30),
        unitHeight: inches(80),
      },
    ],
  },

  /** Wide load-bearing opening hitting the 2x10 header row. */
  "wide-opening": {
    length: inches(144),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: true,
    bottomPlatePT: true,
    openings: [
      {
        id: "slider-1",
        kind: "door",
        offset: inches(36),
        unitWidth: inches(60),
        unitHeight: inches(80),
        roOverride: { width: inches(62), height: inches(82.5) },
      },
    ],
  },

  /** 20' wall — forces plate splicing. */
  "long-20ft": {
    length: inches(240),
    height: inches(97.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: false,
    bottomPlatePT: true,
    openings: [],
  },

  /** 9' ceiling wall — 104 5/8" precut studs. */
  "tall-9ft": {
    length: inches(96),
    height: inches(109.125),
    studSize: "2x4",
    spacingOC: inches(16),
    topPlate: "double",
    loadBearing: false,
    bottomPlatePT: true,
    openings: [],
  },
};
