import { describe, expect, it } from "vitest";
import {
  feet,
  formatLength,
  fromMm,
  inches,
  parseLength,
  type Sixteenths,
  toMm,
} from "./index";

const ok = (raw: string, system: "imperial" | "metric" = "imperial") => {
  const r = parseLength(raw, system);
  if (!r.ok) throw new Error(`Expected "${raw}" to parse, got: ${r.error}`);
  return r.value as number;
};

describe("parseLength — imperial", () => {
  it("parses whole inches", () => {
    expect(ok("48")).toBe(48 * 16);
    expect(ok('48"')).toBe(48 * 16);
    expect(ok("48 in")).toBe(48 * 16);
    expect(ok("48 inches")).toBe(48 * 16);
  });

  it("parses whole + fraction", () => {
    expect(ok("92 5/8")).toBe(92 * 16 + 10);
    expect(ok("92-5/8")).toBe(92 * 16 + 10);
    expect(ok('92 5/8"')).toBe(92 * 16 + 10);
    expect(ok("3 1/16")).toBe(3 * 16 + 1);
  });

  it("parses bare fractions", () => {
    expect(ok("5/8")).toBe(10);
    expect(ok("1/2")).toBe(8);
    expect(ok("15/16")).toBe(15);
  });

  it("parses feet + inches", () => {
    expect(ok("7' 4 1/2\"")).toBe(7 * 192 + 4 * 16 + 8);
    expect(ok("7′ 4 1/2″")).toBe(7 * 192 + 4 * 16 + 8); // unicode primes
    expect(ok("8'")).toBe(8 * 192);
    expect(ok("8 ft")).toBe(8 * 192);
    expect(ok("6ft 3in")).toBe(6 * 192 + 3 * 16);
  });

  it("parses decimals to nearest sixteenth", () => {
    expect(ok("92.625")).toBe(92 * 16 + 10);
    expect(ok("1.03")).toBe(16); // 1.03" ≈ 1"
  });

  it("rejects non-tape fractions", () => {
    expect(parseLength("5 1/3").ok).toBe(false);
    expect(parseLength("5 3/32").ok).toBe(false);
    expect(parseLength("5 5/12").ok).toBe(false);
  });

  it("rejects junk and non-positive", () => {
    expect(parseLength("").ok).toBe(false);
    expect(parseLength("banana").ok).toBe(false);
    expect(parseLength("-4").ok).toBe(false);
    expect(parseLength("0").ok).toBe(false);
  });
});

describe("parseLength — metric", () => {
  it("explicit metric suffix works in imperial mode", () => {
    expect(ok("25.4mm")).toBe(16);
    expect(ok("2.54 cm")).toBe(16);
    expect(ok("0.0254 m")).toBe(16);
  });

  it("bare numbers are mm in metric mode", () => {
    expect(ok("25.4", "metric")).toBe(16);
    expect(ok("2438", "metric")).toBe(fromMm(2438) as number);
  });
});

describe("formatLength", () => {
  it("formats inches with reduced fractions", () => {
    expect(formatLength(inches(92.625))).toBe('92 5/8"');
    expect(formatLength(inches(48))).toBe('48"');
    expect(formatLength((3 * 16 + 1) as Sixteenths)).toBe('3 1/16"');
    expect(formatLength(8 as Sixteenths)).toBe('1/2"');
  });

  it("formats feet-inches mode", () => {
    expect(formatLength(feet(8), { feetInches: true })).toBe("8'");
    expect(formatLength(inches(97.125), { feetInches: true })).toBe("8' 1 1/8\"");
    expect(formatLength(inches(11), { feetInches: true })).toBe('11"');
  });

  it("formats metric", () => {
    expect(formatLength(inches(1), { system: "metric" })).toBe("25 mm");
    expect(formatLength(feet(8), { system: "metric" })).toBe("2438 mm");
  });

  it("round-trips parse(format(x)) === x", () => {
    const samples = [1, 8, 16, 92 * 16 + 10, 97 * 16 + 2, 8 * 192, 240 * 16 + 3];
    for (const n of samples) {
      const v = n as Sixteenths;
      expect(ok(formatLength(v))).toBe(n);
      expect(ok(formatLength(v, { feetInches: true }))).toBe(n);
    }
  });
});

describe("metric conversion", () => {
  it("toMm/fromMm round-trip within a sixteenth", () => {
    for (const n of [1, 7, 100, 5000]) {
      expect(Math.abs((fromMm(toMm(n as Sixteenths)) as number) - n)).toBeLessThanOrEqual(0);
    }
  });
});
