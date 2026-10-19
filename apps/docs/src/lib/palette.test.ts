import { describe, expect, it } from "vite-plus/test";
import {
  STOPS,
  createPalette,
  foregroundFor,
  inGamut,
  nearestStop,
  normalizeHex,
  toHex,
  toOklch,
} from "./palette.ts";

const INPUTS = [
  "#3b82f6",
  "#fef08a",
  "#16a34a",
  "#7c3aed",
  "#71717a",
  "#000000",
  "#ffffff",
  "#e11d48",
];

describe("normalizeHex", () => {
  it("accepts short and long forms, with or without #", () => {
    expect(normalizeHex("ABC")).toBe("#aabbcc");
    expect(normalizeHex("#3B82F6")).toBe("#3b82f6");
    expect(normalizeHex(" 3b82f6 ")).toBe("#3b82f6");
  });

  it("rejects anything else", () => {
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("blue")).toBeNull();
  });
});

describe("toOklch", () => {
  it("round-trips through hex", () => {
    for (const hex of INPUTS) expect(toHex(toOklch(hex))).toBe(hex);
  });

  it("gives a gray a hue of 0, never NaN", () => {
    expect(toOklch("#808080").h).toBe(0);
    expect(toOklch("#000").h).toBe(0);
  });
});

describe("nearestStop", () => {
  it("places colors by lightness against the kit's scale", () => {
    expect(nearestStop("#3b82f6")).toBe(500);
    expect(nearestStop("#fef08a")).toBeLessThanOrEqual(300);
    expect(nearestStop("#ffffff")).toBe(50);
    expect(nearestStop("#000000")).toBe(950);
  });
});

describe("createPalette", () => {
  it("keeps the input at its stop", () => {
    for (const hex of INPUTS) {
      const palette = createPalette(hex);
      expect(toHex(palette.colors[palette.stop])).toBe(hex);
      // The CSS string carries enough precision to land on the same color.
      const [, l, c, h] = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(
        palette.swatches[palette.stop],
      )!;
      expect(toHex({ l: +l, c: +c, h: +h })).toBe(hex);
    }
  });

  it("darkens monotonically from 50 to 950", () => {
    for (const hex of INPUTS) {
      const { colors } = createPalette(hex);
      for (let i = 1; i < STOPS.length; i++) {
        expect(colors[STOPS[i]].l).toBeLessThanOrEqual(colors[STOPS[i - 1]].l);
      }
    }
  });

  it("stays inside sRGB at every stop", () => {
    for (const hex of INPUTS) {
      const { colors } = createPalette(hex);
      for (const stop of STOPS) expect(inGamut(colors[stop])).toBe(true);
    }
  });

  it("writes every swatch as an oklch() value", () => {
    const { swatches } = createPalette("#71717a");
    for (const stop of STOPS) expect(swatches[stop]).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
  });
});

describe("foregroundFor", () => {
  it("puts white on dark fills and the palette's 950 on light ones", () => {
    expect(foregroundFor(createPalette("#1e3a8a"), "primary")).toBe("var(--color-white)");
    expect(foregroundFor(createPalette("#fef08a"), "primary")).toBe("var(--color-primary-950)");
  });
});
