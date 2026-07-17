import type { DeviceKind } from "@/lib/modules/electrical/types";

/**
 * Pictorial device glyphs: body drawing + terminal anchor coordinates,
 * in a local coordinate space with origin at the glyph's top-left.
 * Terminal ids match the device catalog; missing ids simply aren't drawn.
 */

export interface GlyphTerminal {
  x: number;
  y: number;
  side: "left" | "right" | "top" | "bottom";
}

export interface Glyph {
  w: number;
  h: number;
  terminals: Record<string, GlyphTerminal>;
  Body: (props: { prepActive?: boolean }) => React.ReactNode;
}

const bodyStroke = "var(--bp-line-soft)";
const bodyFill = "var(--bp-paper-raised)";
const faceFill = "rgba(232,242,252,0.14)";

function OutletFace({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x + 24} cy={y + 24} r={21} fill={faceFill} stroke={bodyStroke} />
      <rect x={x + 14} y={y + 12} width={4} height={13} rx={1.5} fill={bodyStroke} />
      <rect x={x + 30} y={y + 12} width={4} height={11} rx={1.5} fill={bodyStroke} />
      <circle cx={x + 24} cy={y + 34} r={3.4} fill="none" stroke={bodyStroke} />
    </g>
  );
}

function ReceptacleBody() {
  return (
    <g>
      <rect x={8} y={0} width={80} height={150} rx={10} fill={bodyFill} stroke={bodyStroke} />
      <OutletFace x={24} y={14} />
      <OutletFace x={24} y={84} />
    </g>
  );
}

function SwitchedReceptacleBody({ prepActive }: { prepActive?: boolean }) {
  return (
    <g>
      <rect x={8} y={0} width={80} height={150} rx={10} fill={bodyFill} stroke={bodyStroke} />
      <OutletFace x={24} y={14} />
      <OutletFace x={24} y={84} />
      {/* the break-off tab between the two brass terminals */}
      <rect
        x={86}
        y={64}
        width={8}
        height={20}
        rx={2}
        fill={prepActive ? "var(--bp-accent)" : "#d9b13b"}
        stroke={prepActive ? "var(--bp-accent-strong)" : bodyStroke}
      />
      <text x={104} y={78} fontSize={10} fill={prepActive ? "var(--bp-accent)" : "var(--bp-line-soft)"}>
        {prepActive ? "◀ snap this tab off" : "tab"}
      </text>
    </g>
  );
}

function GfciBody() {
  return (
    <g>
      <rect x={8} y={0} width={80} height={150} rx={10} fill={bodyFill} stroke={bodyStroke} />
      <OutletFace x={24} y={8} />
      <rect x={30} y={62} width={36} height={12} rx={2} fill={faceFill} stroke={bodyStroke} />
      <text x={48} y={71} fontSize={8} textAnchor="middle" fill={bodyStroke}>
        TEST
      </text>
      <rect x={30} y={78} width={36} height={12} rx={2} fill={faceFill} stroke={bodyStroke} />
      <text x={48} y={87} fontSize={8} textAnchor="middle" fill={bodyStroke}>
        RESET
      </text>
      <OutletFace x={24} y={96} />
    </g>
  );
}

function SwitchBody() {
  return (
    <g>
      <rect x={6} y={0} width={72} height={132} rx={9} fill={bodyFill} stroke={bodyStroke} />
      <rect x={32} y={38} width={20} height={56} rx={4} fill={faceFill} stroke={bodyStroke} />
      <rect x={35} y={44} width={14} height={22} rx={3} fill={bodyStroke} opacity={0.7} />
    </g>
  );
}

function DimmerBody() {
  return (
    <g>
      <rect x={6} y={0} width={72} height={132} rx={9} fill={bodyFill} stroke={bodyStroke} />
      <rect x={38} y={22} width={8} height={88} rx={4} fill={faceFill} stroke={bodyStroke} />
      <rect x={30} y={52} width={24} height={12} rx={3} fill={bodyStroke} opacity={0.75} />
    </g>
  );
}

function SmartBody() {
  return (
    <g>
      <rect x={6} y={0} width={78} height={140} rx={9} fill={bodyFill} stroke={bodyStroke} />
      <rect x={22} y={26} width={46} height={62} rx={4} fill={faceFill} stroke={bodyStroke} />
      <circle cx={45} cy={106} r={4} fill="var(--bp-ok)" />
      <path d="M 36 40 q 9 -8 18 0 M 40 48 q 5 -5 10 0" fill="none" stroke={bodyStroke} strokeWidth={1.6} />
    </g>
  );
}

function LightBody() {
  return (
    <g>
      <circle cx={58} cy={62} r={52} fill={bodyFill} stroke={bodyStroke} />
      <circle cx={58} cy={62} r={30} fill={faceFill} stroke={bodyStroke} />
      <path d="M 46 62 q 12 -16 24 0 q -12 16 -24 0" fill="none" stroke={bodyStroke} strokeWidth={1.6} />
    </g>
  );
}

function FanBody() {
  return (
    <g>
      <circle cx={62} cy={70} r={26} fill={bodyFill} stroke={bodyStroke} />
      {[0, 120, 240].map((a) => (
        <ellipse
          key={a}
          cx={62}
          cy={70}
          rx={56}
          ry={14}
          transform={`rotate(${a} 62 70)`}
          fill={faceFill}
          stroke={bodyStroke}
        />
      ))}
      <circle cx={62} cy={70} r={10} fill={bodyStroke} opacity={0.6} />
    </g>
  );
}

function Receptacle240Body() {
  return (
    <g>
      <rect x={12} y={8} width={86} height={134} rx={10} fill={bodyFill} stroke={bodyStroke} />
      <circle cx={55} cy={75} r={34} fill={faceFill} stroke={bodyStroke} />
      <rect x={36} y={68} width={5} height={16} rx={2} fill={bodyStroke} transform="rotate(24 38 76)" />
      <rect x={70} y={68} width={5} height={16} rx={2} fill={bodyStroke} transform="rotate(-24 72 76)" />
      <rect x={52.5} y={86} width={5} height={13} rx={2} fill={bodyStroke} />
      <circle cx={55} cy={56} r={4} fill="none" stroke={bodyStroke} />
    </g>
  );
}

export const GLYPHS: Record<DeviceKind, Glyph> = {
  "receptacle-duplex": {
    w: 96,
    h: 150,
    terminals: {
      brass: { x: 92, y: 52, side: "right" },
      silver: { x: 4, y: 52, side: "left" },
      ground: { x: 28, y: 148, side: "bottom" },
    },
    Body: ReceptacleBody,
  },
  "receptacle-gfci": {
    w: 96,
    h: 150,
    terminals: {
      "load-brass": { x: 92, y: 36, side: "right" },
      "load-silver": { x: 4, y: 36, side: "left" },
      "line-brass": { x: 92, y: 112, side: "right" },
      "line-silver": { x: 4, y: 112, side: "left" },
      ground: { x: 28, y: 148, side: "bottom" },
    },
    Body: GfciBody,
  },
  "receptacle-switched": {
    w: 96,
    h: 150,
    terminals: {
      "brass-top": { x: 92, y: 38, side: "right" },
      "brass-bottom": { x: 92, y: 108, side: "right" },
      silver: { x: 4, y: 72, side: "left" },
      ground: { x: 28, y: 148, side: "bottom" },
    },
    Body: SwitchedReceptacleBody,
  },
  "switch-single-pole": {
    w: 84,
    h: 132,
    terminals: {
      t2: { x: 80, y: 40, side: "right" },
      t1: { x: 80, y: 96, side: "right" },
      ground: { x: 20, y: 130, side: "bottom" },
    },
    Body: SwitchBody,
  },
  "switch-3way": {
    w: 84,
    h: 132,
    terminals: {
      "t-a": { x: 80, y: 38, side: "right" },
      "t-b": { x: 80, y: 90, side: "right" },
      common: { x: 4, y: 106, side: "left" },
      ground: { x: 20, y: 130, side: "bottom" },
    },
    Body: SwitchBody,
  },
  "switch-4way": {
    w: 84,
    h: 132,
    terminals: {
      "in-a": { x: 4, y: 44, side: "left" },
      "in-b": { x: 4, y: 92, side: "left" },
      "out-a": { x: 80, y: 44, side: "right" },
      "out-b": { x: 80, y: 92, side: "right" },
      ground: { x: 20, y: 130, side: "bottom" },
    },
    Body: SwitchBody,
  },
  "dimmer-single-pole": {
    w: 84,
    h: 132,
    terminals: {
      "lead-1": { x: 4, y: 36, side: "left" },
      "lead-2": { x: 4, y: 72, side: "left" },
      "lead-ground": { x: 4, y: 108, side: "left" },
    },
    Body: DimmerBody,
  },
  "dimmer-3way": {
    w: 84,
    h: 132,
    terminals: {
      "lead-common": { x: 4, y: 30, side: "left" },
      "lead-t1": { x: 4, y: 62, side: "left" },
      "lead-t2": { x: 4, y: 94, side: "left" },
      "lead-ground": { x: 4, y: 124, side: "left" },
    },
    Body: DimmerBody,
  },
  "smart-switch": {
    w: 90,
    h: 140,
    terminals: {
      load: { x: 86, y: 40, side: "right" },
      line: { x: 86, y: 100, side: "right" },
      neutral: { x: 4, y: 70, side: "left" },
      ground: { x: 22, y: 138, side: "bottom" },
    },
    Body: SmartBody,
  },
  "ceiling-light": {
    w: 116,
    h: 124,
    terminals: {
      "lead-hot": { x: 6, y: 34, side: "left" },
      "lead-neutral": { x: 6, y: 62, side: "left" },
      "lead-ground": { x: 6, y: 90, side: "left" },
    },
    Body: LightBody,
  },
  "ceiling-fan": {
    w: 124,
    h: 140,
    terminals: {
      "lead-fan": { x: 6, y: 28, side: "left" },
      "lead-light": { x: 6, y: 56, side: "left" },
      "lead-neutral": { x: 6, y: 84, side: "left" },
      "lead-ground": { x: 6, y: 112, side: "left" },
    },
    Body: FanBody,
  },
  "receptacle-240": {
    w: 110,
    h: 150,
    terminals: {
      "term-y": { x: 8, y: 78, side: "left" },
      "term-x": { x: 102, y: 78, side: "right" },
      "term-w": { x: 55, y: 146, side: "bottom" },
      ground: { x: 55, y: 4, side: "top" },
    },
    Body: Receptacle240Body,
  },
};
