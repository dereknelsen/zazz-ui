import { describe, expect, it } from "vite-plus/test";
import { STOPS, toHex, toOklch, type Stop } from "./palette.ts";
import {
  TAILWIND_NEUTRALS,
  TAILWIND_PALETTES,
  tailwindColor,
  type TailwindPalette,
} from "./tailwind-colors.ts";
import { SCALE_STEPS } from "./fonts.ts";
import {
  RANDOM_BACKGROUNDS,
  RANDOM_RANGES,
  randomColors,
  randomInRanges,
  randomScales,
  randomStep,
} from "./randomize.ts";

/** A spread of seeds across the random range. */
const seeds = Array.from({ length: 50 }, (_, i) => {
  let n = i / 50;
  // A cheap deterministic sequence, different on every call.
  return () => (n = (n * 9301 + 0.49297) % 1);
});

describe("randomStep", () => {
  it("lands on the step grid inside the range", () => {
    for (const random of seeds) {
      const value = randomStep(0.2, 0.3, 0.01, random);
      expect(value).toBeGreaterThanOrEqual(0.2);
      expect(value).toBeLessThanOrEqual(0.3);
      expect(Math.round(value * 100)).toBeCloseTo(value * 100, 6);
    }
  });

  it("reaches both ends", () => {
    expect(randomStep(0, 360, 15, () => 0)).toBe(0);
    expect(randomStep(0, 360, 15, () => 0.9999)).toBe(360);
  });
});

describe("randomColors", () => {
  /** Every Tailwind color in `palettes`, as hex. */
  const hexes = (palettes: readonly TailwindPalette[]) =>
    new Set(palettes.flatMap((p) => STOPS.map((s) => toHex(tailwindColor(p, s)))));
  const any = hexes(TAILWIND_PALETTES);
  const grays = hexes(TAILWIND_NEUTRALS);

  it("draws every color from Tailwind's palettes, the neutral from a gray one", () => {
    for (const random of seeds) {
      const { primary, secondary, tertiary, neutral, shadow } = randomColors(random);
      for (const color of [primary, secondary, tertiary]) expect(any).toContain(color);
      expect(grays).toContain(neutral);
      expect(toOklch(shadow).l).toBeLessThan(0.35);
    }
  });

  it("takes the shadow color from the neutral's palette", () => {
    for (const random of seeds) {
      const { neutral, shadow } = randomColors(random);
      const palette = TAILWIND_NEUTRALS.find((p) => toHex(tailwindColor(p, 500)) === neutral)!;
      expect([900, 950].map((s) => toHex(tailwindColor(palette, s as Stop)))).toContain(shadow);
    }
  });

  it("gives the accents three different colors", () => {
    for (const random of seeds) {
      const { primary, secondary, tertiary } = randomColors(random);
      expect(new Set([primary, secondary, tertiary]).size).toBe(3);
    }
  });

  it("keeps the accents dark enough to read on white", () => {
    for (const random of seeds) {
      const { primary, secondary, tertiary } = randomColors(random);
      for (const color of [primary, secondary, tertiary]) {
        expect(toOklch(color).l).toBeLessThanOrEqual(0.71);
      }
    }
    // Yellow is the first palette whose 500 is too light: it starts at 600.
    for (let i = 0; i < 10; i++) {
      const yellow = TAILWIND_PALETTES.indexOf("yellow") / TAILWIND_PALETTES.length + 0.001;
      const { primary } = randomColors(() => (i === 0 ? yellow : i / 10));
      expect(toOklch(primary).l).toBeLessThanOrEqual(0.71);
    }
  });

  it("can pick a gray primary", () => {
    const { primary } = randomColors(() => 0.99);
    expect(grays).toContain(primary);
  });
});

describe("randomScales", () => {
  it("draws narrow from 1.067 to 1.25 and wide from 1.25 to 1.414", () => {
    const values = SCALE_STEPS.map((s) => s.value);
    const mins = new Set<number>();
    const maxes = new Set<number>();
    for (const random of seeds) {
      const { min, max } = randomScales(random);
      expect(values).toContain(min);
      expect(values).toContain(max);
      mins.add(min);
      maxes.add(max);
    }
    expect([...mins].every((v) => v >= 1.067 && v <= 1.25)).toBe(true);
    expect([...maxes].every((v) => v >= 1.25 && v <= 1.414)).toBe(true);
    expect(mins.size).toBeGreaterThan(1);
    expect(maxes.size).toBeGreaterThan(1);
  });
});

describe("randomInRanges", () => {
  it("lands only inside one of the ranges, on the step grid", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      seen.add(randomInRanges(RANDOM_RANGES["shadow-angle"], 15, () => i / 100));
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 15, 30, 45, 315, 330, 345, 360]);
  });
});

describe("RANDOM_RANGES", () => {
  it("keeps each slider in its tasteful slice", () => {
    expect(RANDOM_RANGES).toEqual({
      spacing: [[0.15, 0.35]],
      radius: [[0, 2.5]],
      "corner-shape": [[1, 3]],
      "card-elevation": [[0, 4]],
      "shadow-angle": [
        [0, 45],
        [315, 360],
      ],
      "shadow-intensity": [[0.5, 3]],
      "shadow-blur": [[0.8, 3]],
      "shadow-distance": [[0.1, 2]],
    });
  });
});

describe("RANDOM_BACKGROUNDS", () => {
  it("keeps light pages light and dark pages dark", () => {
    expect(RANDOM_BACKGROUNDS).toEqual({
      light: ["white", "50"],
      dark: ["900", "950", "black"],
    });
  });
});
