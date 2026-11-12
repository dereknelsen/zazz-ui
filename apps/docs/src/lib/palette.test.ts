import { describe, expect, it } from "vite-plus/test";
import {
  BACKGROUNDS,
  STOPS,
  backgroundToken,
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

  it("tapers a neutral's chroma toward the light end, like Tailwind's grays", () => {
    // Tailwind's slate-500.
    const hex = toHex({ l: 0.554, c: 0.046, h: 257.417 });
    const { stop, colors } = createPalette(hex, { neutral: true });
    expect(stop).toBe(500);
    const light = STOPS.filter((s) => s < stop);
    for (let i = 1; i < light.length; i++) {
      expect(colors[light[i]].c).toBeGreaterThan(colors[light[i - 1]].c);
    }
    expect(colors[50].c).toBeLessThan(0.01);
    expect(colors[50].c).toBeGreaterThan(0);
    // The input's own stop and the dark end keep the input's chroma.
    expect(colors[500].c).toBeCloseTo(0.046, 3);
    expect(colors[900].c).toBeCloseTo(createPalette(hex).colors[900].c, 6);
  });

  it("keeps the chroma at the light end unless asked to taper", () => {
    const { colors } = createPalette(toHex({ l: 0.554, c: 0.046, h: 257.417 }));
    // At 300 the color is still inside sRGB, so nothing clips it either.
    expect(colors[300].c).toBeCloseTo(0.046, 3);
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

describe("BACKGROUNDS", () => {
  it("offers white and the five lightest neutrals for light mode", () => {
    expect(BACKGROUNDS.light).toEqual(["white", "50", "100", "200", "300", "400"]);
  });

  it("offers the five darkest neutrals and black for dark mode", () => {
    expect(BACKGROUNDS.dark).toEqual(["600", "700", "800", "900", "950", "black"]);
  });
});

describe("backgroundToken", () => {
  it("is null at the kit's own background", () => {
    expect(backgroundToken("white", "900")).toBeNull();
  });

  it("pairs the light and dark picks in one light-dark()", () => {
    expect(backgroundToken("100", "900")).toBe(
      "--color-background: light-dark(var(--color-neutral-100), var(--color-neutral-900))",
    );
    expect(backgroundToken("white", "black")).toBe(
      "--color-background: light-dark(var(--color-white), var(--color-black))",
    );
  });
});
