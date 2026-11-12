/**
 * The theme builder's randomizer: pure pickers for the values that need more
 * care than "anywhere on the slider". Colors come from Tailwind's palettes (a
 * gray one for the neutral), and the type scale never shrinks from narrow to
 * wide. scripts/theme-builder.ts applies them to the form.
 */
import { SCALE_STEPS } from "./fonts.ts";
import { toHex, type Stop } from "./palette.ts";
import {
  TAILWIND_NEUTRALS,
  TAILWIND_PALETTES,
  tailwindColor,
  type TailwindPalette,
} from "./tailwind-colors.ts";

export type Random = () => number;

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

/** The stops a primary, secondary, or tertiary takes: mid-tones, or the dark end of a gray. */
const ACCENT_STOPS: readonly Stop[] = [500, 600, 700];
const GRAY_ACCENT_STOPS: readonly Stop[] = [800, 900, 950];

/** The stops a shadow color takes from the neutral's palette: dark enough to read as shadow. */
const SHADOW_STOPS: readonly Stop[] = [900, 950];

const isNeutral = (palette: TailwindPalette) =>
  (TAILWIND_NEUTRALS as readonly string[]).includes(palette);

/** The lightest an accent may be and still read as a link or focus ring on white. */
const MAX_ACCENT_L = 0.7;

/**
 * A Tailwind accent color: a mid stop of a hue, or a dark stop of a gray.
 * Stops lighter than `MAX_ACCENT_L` are skipped, so yellow, lime, and amber
 * start at their 600.
 */
function accent(palette: TailwindPalette, random: Random): string {
  const stops = (isNeutral(palette) ? GRAY_ACCENT_STOPS : ACCENT_STOPS).filter(
    (s) => tailwindColor(palette, s).l <= MAX_ACCENT_L,
  );
  return toHex(tailwindColor(palette, pick(stops, random)));
}

/**
 * Theme colors from Tailwind's default palettes: a primary, a secondary, and
 * a tertiary from any three different palettes, a neutral from a gray one
 * (its 500, where the kit's neutral sits), and a shadow color from a dark stop
 * of that same gray palette.
 */
export function randomColors(random: Random): {
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
  shadow: string;
} {
  const primary = pick(TAILWIND_PALETTES, random);
  const secondary = pick(
    TAILWIND_PALETTES.filter((p) => p !== primary),
    random,
  );
  const tertiary = pick(
    TAILWIND_PALETTES.filter((p) => p !== primary && p !== secondary),
    random,
  );
  const neutral = pick(TAILWIND_NEUTRALS, random);
  return {
    primary: accent(primary, random),
    secondary: accent(secondary, random),
    tertiary: accent(tertiary, random),
    neutral: toHex(tailwindColor(neutral, 500)),
    shadow: toHex(tailwindColor(neutral, pick(SHADOW_STOPS, random))),
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
