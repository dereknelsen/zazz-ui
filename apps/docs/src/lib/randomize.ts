/**
 * The theme builder's randomizer: pure pickers for the values that need more
 * care than "anywhere on the slider". Colors stay usable (a colorful primary,
 * a near-gray neutral, a dark shadow) and the type scale never shrinks from
 * narrow to wide. scripts/theme-builder.ts applies them to the form.
 */
import { SCALE_STEPS } from "./fonts.ts";
import { toHex } from "./palette.ts";

export type Random = () => number;

const between = (min: number, max: number, random: Random) => min + random() * (max - min);

/** Every value on the `step` grid from `min` to `max`, both ends included. */
function grid(min: number, max: number, step: number): number[] {
  // Round off float drift (0.1 + 0.2) to the step's decimals.
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) =>
    Number((min + i * step).toFixed(decimals)),
  );
}

const pick = <T>(values: readonly T[], random: Random): T =>
  values[Math.min(values.length - 1, Math.floor(random() * values.length))];

/** A value on the `step` grid from `min` to `max`, both ends included. */
export function randomStep(min: number, max: number, step: number, random: Random): number {
  return pick(grid(min, max, step), random);
}

/** A primary, a neutral tinted toward a hue of its own, and a shadow color. */
export function randomColors(random: Random): {
  primary: string;
  neutral: string;
  shadow: string;
} {
  const hue = between(0, 360, random);
  // The neutral leans toward the primary's hue most of the time, like the kit's zinc.
  const neutralHue = random() < 0.7 ? hue : between(0, 360, random);
  return {
    primary: toHex({ l: between(0.45, 0.7, random), c: between(0.1, 0.2, random), h: hue }),
    neutral: toHex({ l: between(0.55, 0.65, random), c: between(0, 0.03, random), h: neutralHue }),
    // Black half the time; otherwise a deep tint of the primary's hue.
    shadow:
      random() < 0.5
        ? "#000000"
        : toHex({ l: between(0.15, 0.3, random), c: between(0.02, 0.08, random), h: hue }),
  };
}

/** The pick a ratio comes from: `SCALE_STEPS` values from `min` to `max`. */
const scaleSteps = (min: number, max: number) =>
  SCALE_STEPS.map((s) => s.value).filter((v) => v >= min && v <= max);

/**
 * Narrow and wide type-scale ratios from `SCALE_STEPS`: narrow from the minor
 * second to the major third, wide from the major third to the augmented
 * fourth, so the wide one is never smaller and headings never outgrow the cards.
 */
export function randomScales(random: Random): { min: number; max: number } {
  const low = scaleSteps(1.067, 1.25);
  const high = scaleSteps(1.25, 1.414);
  return { min: pick(low, random), max: pick(high, random) };
}

/** A span of a slider, both ends included. */
type Span = readonly [number, number];

/**
 * The slices of each slider the randomizer draws from, by field name: the
 * ranges that keep a theme looking designed, narrower than the sliders allow.
 * The shadow angle has two slices so the light always comes from above.
 */
export const RANDOM_RANGES: Record<string, readonly Span[]> = {
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
};

/** A value on the `step` grid inside one of `spans`, every grid value equally likely. */
export function randomInRanges(spans: readonly Span[], step: number, random: Random): number {
  return pick([...new Set(spans.flatMap(([min, max]) => grid(min, max, step)))], random);
}

/** The backgrounds the randomizer picks, by scheme: the lightest light ones and the darkest dark ones. */
export const RANDOM_BACKGROUNDS = {
  light: ["white", "50"],
  dark: ["900", "950", "black"],
} as const;
