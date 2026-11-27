/**
 * The theme builder's randomizer: pure pickers for the values that need more
 * care than "anywhere on the slider". Colors come from Tailwind's palettes (a
 * gray one for the neutral), the accents related by a color harmony, and the
 * type scale never shrinks from narrow to wide. scripts/theme-builder.ts applies them to the form.
 */
import { SCALE_STEPS } from "./fonts.ts";
import { normalizeHex, toHex, toOklch, type Stop } from "./palette.ts";
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

/** The stops a primary or secondary takes: mid-tones, or the dark end of a gray. */
const ACCENT_STOPS: readonly Stop[] = [500, 600, 700];
/** The stops a tertiary takes: the most saturated, so the accent stands out. */
const VIVID_STOPS: readonly Stop[] = [500, 600];
const GRAY_ACCENT_STOPS: readonly Stop[] = [800, 900, 950];

/** The stops a shadow color takes from the neutral's palette: dark enough to read as shadow. */
const SHADOW_STOPS: readonly Stop[] = [900, 950];

const isNeutral = (palette: TailwindPalette) =>
  (TAILWIND_NEUTRALS as readonly string[]).includes(palette);

/** The lightest an accent may be and still read as a link or focus ring on white. */
const MAX_ACCENT_L = 0.7;

/** The stops an accent falls back to when a palette has to give more colors than its mid stops hold. */
const DEEP_ACCENT_STOPS: readonly Stop[] = [800, 900];

/**
 * A Tailwind accent color: a mid stop of a hue, or a dark stop of a gray.
 * Stops lighter than `MAX_ACCENT_L` are skipped, so yellow, lime, and amber
 * start at their 600. A color already in `used` is skipped too, so one palette
 * can give several accents; when its mid stops run out it goes deeper.
 */
function accent(
  palette: TailwindPalette,
  random: Random,
  used: ReadonlySet<string>,
  stops: readonly Stop[] = isNeutral(palette) ? GRAY_ACCENT_STOPS : ACCENT_STOPS,
): string {
  const free = (stops: readonly Stop[]) =>
    stops
      .filter((s) => tailwindColor(palette, s).l <= MAX_ACCENT_L)
      .map((s) => toHex(tailwindColor(palette, s)))
      .filter((hex) => !used.has(hex));
  const mid = free(stops);
  return pick(mid.length ? mid : free(DEEP_ACCENT_STOPS), random);
}

/**
 * How the tertiary relates to the primary: the turns, in degrees around the
 * wheel from the primary's hue, it may sit at (one is picked). The secondary
 * takes no turn: it is the primary inverted, so it stays in the primary's palette.
 */
export const HARMONIES = {
  analogous: [30, -30],
  complementary: [180],
  "split-complementary": [150, 210],
  triadic: [120, 240],
} as const satisfies Record<string, readonly number[]>;
export type Harmony = keyof typeof HARMONIES;

/** The palettes with a hue of their own, and that hue (their 500's). */
const HUED = TAILWIND_PALETTES.filter((p) => !isNeutral(p)).map((palette) => ({
  palette,
  hue: tailwindColor(palette, 500).h,
}));

/** Degrees between two hues, the short way around. */
const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** The hued palette closest to `hue`, leaving out the ones in `skip`. */
function nearestPalette(hue: number, skip: readonly TailwindPalette[] = []): TailwindPalette {
  return HUED.filter(({ palette }) => !skip.includes(palette)).reduce((a, b) =>
    hueDistance(b.hue, hue) < hueDistance(a.hue, hue) ? b : a,
  ).palette;
}

/** Below this chroma a color has no hue to build a harmony on. */
const MIN_HUED_C = 0.04;

/**
 * Theme colors from Tailwind's default palettes, fitted to the kit's roles.
 * The primary comes from any palette. The secondary is the primary inverted
 * (the builder writes its palette reversed), so it is another stop of the
 * primary's palette. The tertiary is the accent: always a hue, at one of its
 * saturated stops, turned from the primary's by a color harmony picked at
 * random (`HARMONIES`), or any hue under a gray primary (`harmony` is then
 * null). The neutral is a gray palette's 500 (where the kit's neutral sits),
 * and the shadow color a dark stop of that same gray.
 *
 * `keep.primary` is a primary to build on instead of picking one (the theme
 * builder's locked field): it comes back as is, and the others follow its
 * hue. `keep.avoid` lists colors no accent may repeat (a locked secondary
 * or tertiary).
 */
export function randomColors(
  random: Random,
  keep: { primary?: string; avoid?: readonly string[] } = {},
): {
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
  shadow: string;
  harmony: Harmony | null;
} {
  const keptHex = keep.primary ? normalizeHex(keep.primary) : null;
  const kept = keptHex ? toOklch(keptHex) : null;
  let palette: TailwindPalette;
  let hue: number | null;
  if (kept) {
    hue = kept.c >= MIN_HUED_C ? kept.h : null;
    palette = hue === null ? pick(TAILWIND_NEUTRALS, random) : nearestPalette(hue);
  } else {
    palette = pick(TAILWIND_PALETTES, random);
    hue = isNeutral(palette) ? null : tailwindColor(palette, 500).h;
  }

  const used = new Set(keep.avoid?.flatMap((hex) => normalizeHex(hex) ?? []));
  const take = (from: TailwindPalette, stops?: readonly Stop[]) => {
    const hex = accent(from, random, used, stops);
    used.add(hex);
    return hex;
  };
  const primary = keptHex ?? take(palette);
  used.add(primary);
  const secondary = take(palette);

  const harmony: Harmony | null =
    hue === null ? null : pick(Object.keys(HARMONIES) as Harmony[], random);
  const accentPalette =
    hue === null || harmony === null
      ? pick(HUED, random).palette
      : nearestPalette(hue + pick(HARMONIES[harmony], random), [palette]);
  const tertiary = take(accentPalette, VIVID_STOPS);

  const neutral = pick(TAILWIND_NEUTRALS, random);
  return {
    primary,
    secondary,
    tertiary,
    neutral: toHex(tailwindColor(neutral, 500)),
    shadow: toHex(tailwindColor(neutral, pick(SHADOW_STOPS, random))),
    harmony,
  };
}

/** The pick a ratio comes from: `SCALE_STEPS` values from `min` to `max`. */
const scaleSteps = (min: number, max: number) =>
  SCALE_STEPS.map((s) => s.value).filter((v) => v >= min && v <= max);

/**
 * Narrow and wide type-scale ratios from `SCALE_STEPS`: narrow from the minor
 * second to the major third, wide from the major third to the augmented
 * fourth, so the wide one is never smaller and headings never outgrow the cards.
 * A ratio in `keep` (a locked field) comes back as is, and the other one is
 * drawn from the part of its range that keeps narrow at or below wide.
 */
export function randomScales(
  random: Random,
  keep: { min?: number; max?: number } = {},
): { min: number; max: number } {
  const low = scaleSteps(1.067, Math.min(1.25, keep.max ?? 1.25));
  const high = scaleSteps(Math.max(1.25, keep.min ?? 1.25), 1.414);
  return {
    min: keep.min ?? (low.length ? pick(low, random) : keep.max!),
    max: keep.max ?? (high.length ? pick(high, random) : keep.min!),
  };
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
