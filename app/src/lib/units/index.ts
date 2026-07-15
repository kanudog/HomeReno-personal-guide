/**
 * Measurement core. Every length in the app is an integer count of
 * sixteenths of an inch — the finest gradation on a tape measure.
 * Floats never enter stored or compared values; metric exists only
 * at the display/parse boundary.
 */

export type Sixteenths = number & { readonly __brand: "sixteenths" };

export const SIXTEENTHS_PER_INCH = 16;
export const SIXTEENTHS_PER_FOOT = 16 * 12;
const MM_PER_INCH = 25.4;

/** Assert-and-brand an already-integer sixteenths count. */
export function sixteenths(n: number): Sixteenths {
  if (!Number.isInteger(n)) {
    throw new Error(`Not an integer sixteenths value: ${n}`);
  }
  return n as Sixteenths;
}

/** Inches (may be fractional) → nearest sixteenth. */
export const inches = (n: number): Sixteenths =>
  Math.round(n * SIXTEENTHS_PER_INCH) as Sixteenths;

/** Feet (may be fractional) → nearest sixteenth. */
export const feet = (n: number): Sixteenths => inches(n * 12);

/** Millimeters → nearest sixteenth (parse boundary only). */
export const fromMm = (mm: number): Sixteenths =>
  Math.round((mm / MM_PER_INCH) * SIXTEENTHS_PER_INCH) as Sixteenths;

/** Display-only conversions. */
export const toMm = (v: Sixteenths): number => (v / SIXTEENTHS_PER_INCH) * MM_PER_INCH;
export const toInchesFloat = (v: Sixteenths): number => v / SIXTEENTHS_PER_INCH;

export const addLen = (a: Sixteenths, b: Sixteenths): Sixteenths =>
  ((a as number) + (b as number)) as Sixteenths;
export const subLen = (a: Sixteenths, b: Sixteenths): Sixteenths =>
  ((a as number) - (b as number)) as Sixteenths;
export const mulLen = (a: Sixteenths, k: number): Sixteenths => {
  const r = (a as number) * k;
  if (!Number.isInteger(r)) throw new Error(`Non-integer length product: ${a} × ${k}`);
  return r as Sixteenths;
};

export type UnitSystem = "imperial" | "metric";

export type ParseResult =
  | { ok: true; value: Sixteenths }
  | { ok: false; error: string };

const err = (error: string): ParseResult => ({ ok: false, error });

/** Denominators that exist on a tape measure. */
const TAPE_DENOMINATORS = new Set([2, 4, 8, 16]);

/**
 * Parse a human length string.
 *
 * Imperial forms: `92 5/8`, `92-5/8`, `92 5/8"`, `7' 4 1/2"`, `7ft 4.5in`,
 * `8'`, `5/8`, `92.625`, `92.625in`.
 * Metric forms (any mode): `2350mm`, `235cm`, `2.35m`.
 * Bare numbers are inches in imperial mode, millimeters in metric mode.
 */
export function parseLength(raw: string, system: UnitSystem = "imperial"): ParseResult {
  let s = raw
    .trim()
    .toLowerCase()
    // normalize unicode quotes/primes to ascii
    .replace(/[′’]/g, "'")
    .replace(/[″”“]/g, '"')
    .replace(/\s+/g, " ");
  if (s.length === 0) return err("Enter a length");
  if (s.startsWith("-")) return err("Lengths must be positive");

  // Explicit metric suffix wins in any mode
  const metric = s.match(/^(\d+(?:\.\d+)?) ?(mm|cm|m)$/);
  if (metric) {
    const n = Number(metric[1]);
    const factor = metric[2] === "mm" ? 1 : metric[2] === "cm" ? 10 : 1000;
    const v = fromMm(n * factor);
    if (v <= 0) return err("Length is too small (rounds to 0)");
    return { ok: true, value: v };
  }

  if (system === "metric" && /^\d+(?:\.\d+)?$/.test(s)) {
    const v = fromMm(Number(s));
    if (v <= 0) return err("Length is too small (rounds to 0)");
    return { ok: true, value: v };
  }

  // Imperial. Normalize unit words.
  s = s
    .replace(/ ?(feet|foot|ft)\.? ?/g, "' ")
    .replace(/ ?(inches|inch|in)\.?$/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  // Split off feet part if present
  let totalSixteenths = 0;
  const feetMatch = s.match(/^(\d+(?:\.\d+)?) ?' ?/);
  if (feetMatch) {
    totalSixteenths += Math.round(Number(feetMatch[1]) * SIXTEENTHS_PER_FOOT);
    s = s.slice(feetMatch[0].length).trim();
    if (s === "" || s === '"') {
      const v = totalSixteenths;
      return v > 0
        ? { ok: true, value: v as Sixteenths }
        : err("Length is too small");
    }
  }

  // Remaining: inches part — `4 1/2"`, `4-1/2`, `4.5`, `1/2`, `4`
  s = s.replace(/"$/, "").trim();

  // whole + fraction, e.g. `4 1/2` or `4-1/2`
  const wholeFrac = s.match(/^(\d+)[ -](\d+)\/(\d+)$/);
  if (wholeFrac) {
    const whole = Number(wholeFrac[1]);
    const num = Number(wholeFrac[2]);
    const den = Number(wholeFrac[3]);
    const fr = fractionToSixteenths(num, den);
    if (fr === null) return err(`Use tape-measure fractions (halves through 16ths): ${num}/${den}`);
    totalSixteenths += whole * SIXTEENTHS_PER_INCH + fr;
  } else {
    // bare fraction
    const frac = s.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      const fr = fractionToSixteenths(Number(frac[1]), Number(frac[2]));
      if (fr === null) return err(`Use tape-measure fractions (halves through 16ths): ${s}`);
      totalSixteenths += fr;
    } else if (/^\d+(?:\.\d+)?$/.test(s)) {
      totalSixteenths += Math.round(Number(s) * SIXTEENTHS_PER_INCH);
    } else if (s !== "") {
      return err(`Couldn't read "${raw}" — try forms like 92 5/8, 7' 4 1/2", or 2350mm`);
    }
  }

  if (totalSixteenths <= 0) return err("Length must be greater than zero");
  return { ok: true, value: totalSixteenths as Sixteenths };
}

function fractionToSixteenths(num: number, den: number): number | null {
  if (!TAPE_DENOMINATORS.has(den)) return null;
  if (num <= 0 || num >= den * 2) return null; // allow improper up to <2" for odd habits? keep < den*2
  const scaled = (num * SIXTEENTHS_PER_INCH) / den;
  return Number.isInteger(scaled) ? scaled : null;
}

export interface FormatOptions {
  system?: UnitSystem;
  /** Render as feet + inches (7' 8 5/8") instead of inches only (92 5/8"). */
  feetInches?: boolean;
  /** Omit the trailing inch mark (for tight SVG labels). */
  bare?: boolean;
}

/** Reduce n/16 to lowest terms. */
function reducedFraction(sixteenthsRemainder: number): string {
  let num = sixteenthsRemainder;
  let den = SIXTEENTHS_PER_INCH;
  while (num % 2 === 0 && den % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return `${num}/${den}`;
}

export function formatLength(v: Sixteenths, opts: FormatOptions = {}): string {
  const { system = "imperial", feetInches = false, bare = false } = opts;

  if (system === "metric") {
    return `${Math.round(toMm(v))} mm`;
  }

  const totalSixteenths = v as number;
  const sign = totalSixteenths < 0 ? "-" : "";
  const abs = Math.abs(totalSixteenths);

  const build = (sixteenthsCount: number): string => {
    const whole = Math.floor(sixteenthsCount / SIXTEENTHS_PER_INCH);
    const rem = sixteenthsCount % SIXTEENTHS_PER_INCH;
    if (whole === 0 && rem === 0) return "0";
    if (rem === 0) return `${whole}`;
    if (whole === 0) return reducedFraction(rem);
    return `${whole} ${reducedFraction(rem)}`;
  };

  if (feetInches && abs >= SIXTEENTHS_PER_FOOT) {
    const ft = Math.floor(abs / SIXTEENTHS_PER_FOOT);
    const remSixteenths = abs % SIXTEENTHS_PER_FOOT;
    const suffix = bare ? "" : '"';
    if (remSixteenths === 0) return `${sign}${ft}'`;
    // disambiguate sub-inch remainders: 3' 0 1/2", never 3' 1/2"
    const inchPart =
      remSixteenths < SIXTEENTHS_PER_INCH
        ? `0 ${reducedFraction(remSixteenths)}`
        : build(remSixteenths);
    return `${sign}${ft}' ${inchPart}${suffix}`;
  }

  return `${sign}${build(abs)}${bare ? "" : '"'}`;
}
