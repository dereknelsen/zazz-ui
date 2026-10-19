/**
 * An 11-stop (50–950) color palette from one input color, in OKLCH.
 *
 * The method follows tints.dev by Simeon Griggs (https://tints.dev): the input
 * takes the stop whose baseline lightness it is closest to, keeps its exact
 * value at that stop, and the other stops are interpolated in lightness toward
 * fixed light and dark ends. This is an independent implementation (tints.dev
 * is CC BY-NC 4.0, so none of its code is used): it works in OKLCH with no
 * dependencies, and its baseline is the kit's own primary scale, so a generated
 * palette keeps the tonal rhythm of `_variables.css`.
 *
 * The sRGB ⇄ OKLab conversions are Björn Ottosson's published matrices
 * (https://bottosson.github.io/posts/oklab/, public domain / MIT).
 */

export const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Stop = (typeof STOPS)[number];

/** The kit's primary scale lightness (`--color-primary-50…950` in `_variables.css`). */
const BASELINE_L: Record<Stop, number> = {
  50: 0.985,
  100: 0.967,
  200: 0.92,
  300: 0.87,
  400: 0.708,
  500: 0.556,
  600: 0.439,
  700: 0.371,
  800: 0.269,
  900: 0.205,
  950: 0.145,
};
const L_MAX = BASELINE_L[50];
const L_MIN = BASELINE_L[950];

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Rgb = [number, number, number];

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalizes `#abc`, `abc`, `#AABBCC` to `#aabbcc`; null when it isn't a hex color. */
export function normalizeHex(input: string): string | null {
  const match = HEX.exec(input.trim());
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
  return `#${hex}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function hexToLinearRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [
    toLinear(((n >> 16) & 255) / 255),
    toLinear(((n >> 8) & 255) / 255),
    toLinear((n & 255) / 255),
  ];
}

function linearRgbToOklch([r, g, b]: Rgb): Oklch {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  // A gray has no hue; pin it to 0 rather than whatever atan2 makes of rounding noise.
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinearRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

export function toOklch(hex: string): Oklch {
  const normal = normalizeHex(hex);
  if (!normal) throw new Error(`Not a hex color: ${hex}`);
  return linearRgbToOklch(hexToLinearRgb(normal));
}

export function inGamut(color: Oklch): boolean {
  return oklchToLinearRgb(color).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
}

/** Converts back to `#rrggbb`, clipping any channel that falls outside sRGB. */
export function toHex(color: Oklch): string {
  return `#${oklchToLinearRgb(color)
    .map((v) =>
      Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** The highest chroma at or below `color.c` that stays inside sRGB, by bisection. */
function clampChroma(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

/** The stop whose baseline lightness is closest to the color's (tints.dev's "auto" stop). */
export function nearestStop(hex: string): Stop {
  const { l } = toOklch(hex);
  let best: Stop = 500;
  for (const stop of STOPS) {
    if (Math.abs(BASELINE_L[stop] - l) < Math.abs(BASELINE_L[best] - l)) best = stop;
  }
  return best;
}

const round = (n: number, digits: number) => Number(n.toFixed(digits));

/** Formats like `_variables.css`: `oklch(0.556 0.123 264.05)`. */
export function formatOklch({ l, c, h }: Oklch, digits = 3): string {
  return `oklch(${round(l, digits)} ${round(c, digits)} ${round(h, 2)})`;
}

export interface Palette {
  /** The stop the input color landed on; its swatch is the input itself. */
  stop: Stop;
  colors: Record<Stop, Oklch>;
  /** CSS values, ready for `--color-<name>-<stop>`. */
  swatches: Record<Stop, string>;
}

export function createPalette(hex: string): Palette {
  const base = toOklch(hex);
  const stop = nearestStop(hex);
  const anchor = BASELINE_L[stop];
  const colors = {} as Record<Stop, Oklch>;
  const swatches = {} as Record<Stop, string>;

  for (const s of STOPS) {
    if (s === stop) {
      colors[s] = base;
      // More precision at the input's own stop, so it round-trips to the same hex.
      swatches[s] = formatOklch(base, 4);
      continue;
    }
    // Remap the baseline curve on each side of the anchor so it passes through
    // the input: lighter stops run from the input up to L_MAX, darker ones down to L_MIN.
    const l =
      s < stop
        ? base.l + (L_MAX - base.l) * ((BASELINE_L[s] - anchor) / (L_MAX - anchor))
        : base.l + (L_MIN - base.l) * ((anchor - BASELINE_L[s]) / (anchor - L_MIN));
    colors[s] = clampChroma({ l, c: base.c, h: base.h });
    swatches[s] = formatOklch(colors[s]);
  }
  return { stop, colors, swatches };
}

function luminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearRgb(color).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two colors. */
export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Oklch = { l: 1, c: 0, h: 0 };

/**
 * The text color for a fill at `stop`: white, or the palette's 950, whichever
 * reads better on it. Returned as the CSS value for `--color-<name>-foreground`.
 */
export function foregroundFor(palette: Palette, name: string): string {
  const fill = palette.colors[palette.stop];
  return contrast(fill, WHITE) >= contrast(fill, palette.colors[950])
    ? "var(--color-white)"
    : `var(--color-${name}-950)`;
}
