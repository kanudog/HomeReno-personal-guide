/**
 * Fastening schedule templates (IRC Table R602.3(1)-style common practice).
 * `perJoint` counts are multiplied by joint counts computed from the layout.
 */
export interface NailingRule {
  jointKey:
    | "stud-to-plate-end"
    | "jack-to-king"
    | "header-to-king"
    | "header-ply"
    | "cripple-to-plate"
    | "sill-to-jack"
    | "plate-to-plate"
    | "blocking"
    | "corner-studs";
  joint: string;
  fastener: string;
  pattern: string;
  nailsPerJoint: number;
  codeRef?: string;
}

export const NAILING_RULES: NailingRule[] = [
  {
    jointKey: "stud-to-plate-end",
    joint: "Stud to plate (end-nailed through plate)",
    fastener: '16d common (3 1/2")',
    pattern: "2 nails through the plate into each stud end",
    nailsPerJoint: 2,
    codeRef: "IRC R602.3(1)",
  },
  {
    jointKey: "jack-to-king",
    joint: "Jack stud to king stud",
    fastener: '10d common (3")',
    pattern: 'face-nail @ 24" OC, staggered',
    nailsPerJoint: 4,
    codeRef: "IRC R602.3(1)",
  },
  {
    jointKey: "header-to-king",
    joint: "Header to king stud",
    fastener: '16d common (3 1/2")',
    pattern: "4 end nails through king into each header end",
    nailsPerJoint: 4,
  },
  {
    jointKey: "header-ply",
    joint: "Header ply to ply",
    fastener: '16d common (3 1/2")',
    pattern: '@ 16" OC along each edge, staggered',
    nailsPerJoint: 6,
  },
  {
    jointKey: "cripple-to-plate",
    joint: "Cripple to plate / header / sill (end-nailed)",
    fastener: '8d common (2 1/2") toenail or 16d end nail',
    pattern: "2 end nails per cripple end",
    nailsPerJoint: 2,
  },
  {
    jointKey: "sill-to-jack",
    joint: "Window sill to jack (end-nailed)",
    fastener: '16d common (3 1/2")',
    pattern: "2 end nails through jack into each sill end",
    nailsPerJoint: 2,
  },
  {
    jointKey: "plate-to-plate",
    joint: "Cap plate to top plate",
    fastener: '10d common (3")',
    pattern: '@ 24" OC, staggered; 2 nails at laps and ends',
    nailsPerJoint: 1, // per 24" of plate length — computed from wall length
    codeRef: "IRC R602.3(1)",
  },
  {
    jointKey: "blocking",
    joint: "Fire block to stud (end-nailed / toe-nailed)",
    fastener: '16d common (3 1/2") end nail or 8d toenail',
    pattern: "2 nails per block end; stagger rows so you can end-nail",
    nailsPerJoint: 4,
    codeRef: "NCRC R302.11",
  },
  {
    jointKey: "corner-studs",
    joint: "Corner studs to intersecting wall",
    fastener: '16d common (3 1/2")',
    pattern: '@ 12" OC through the end stud into the corner assembly',
    nailsPerJoint: 8,
  },
];
