import { describe, expect, it } from "vite-plus/test";
import { toOklch } from "./palette.ts";
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
  it("keeps the neutral near gray and the primary colorful", () => {
    for (const random of seeds) {
      const { primary, neutral, shadow } = randomColors(random);
      expect(toOklch(neutral).c).toBeLessThan(0.04);
      expect(toOklch(primary).c).toBeGreaterThan(0.05);
      expect(toOklch(shadow).l).toBeLessThan(0.35);
    }
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
      spacing: [[0.2, 0.3]],
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
