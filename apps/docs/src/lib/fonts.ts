/**
 * The theme builder's typeset choices: the fluid scale's steps, the local font
 * stacks every build offers, and the Google Fonts helpers. Everything here is
 * pure and runs both at build (ThemeBuilder.astro picks the families) and in
 * the browser (scripts/theme-builder.ts builds the stylesheet link).
 */

/** A step of the fluid type scale, with its musical name where it has one. */
export interface ScaleStep {
  value: number;
  name?: string;
}

/** The common type-scale ratios, smallest first. */
export const SCALE_STEPS: readonly ScaleStep[] = [
  { value: 1.067, name: "Minor second" },
  { value: 1.125, name: "Major second" },
  { value: 1.2, name: "Minor third" },
  { value: 1.25, name: "Major third" },
  { value: 1.333, name: "Perfect fourth" },
  { value: 1.414, name: "Augmented fourth" },
  { value: 1.5, name: "Perfect fifth" },
  { value: 1.618, name: "Golden ratio" },
  { value: 1.667 },
  { value: 1.778 },
  { value: 1.875 },
  { value: 2, name: "Octave" },
];

/**
 * The Google Fonts API categories the builder offers, in the order it groups
 * them. Handwriting is left out.
 */
export const FONT_CATEGORIES = ["sans-serif", "serif", "display", "monospace"] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];

/** The kit's fallback stack for each category. The kit has no display stack, so display faces fall back to sans. */
const FALLBACK: Record<FontCategory, string> = {
  "sans-serif": "var(--font-sans-fallback)",
  serif: "var(--font-serif-fallback)",
  display: "var(--font-sans-fallback)",
  monospace: "var(--font-mono-fallback)",
};

/** A font the builder can offer: a local stack or a Google family. */
export interface FontOption {
  /** The combobox's form value; unique across every group. */
  value: string;
  label: string;
  category: FontCategory;
  /** The `font-family` value written to the token. */
  stack: string;
  /** The Google family name, when the font loads from Google Fonts. */
  google?: string;
  /** The weights to request from Google Fonts. */
  weights?: number[];
}

/** Fonts every build offers, keyed by category: stacks that resolve on the reader's machine. */
export const LOCAL_FONTS: readonly FontOption[] = [
  local("System UI", "sans-serif", "system-ui, var(--font-sans-fallback)"),
  local("Helvetica", "sans-serif", '"Helvetica Neue", Helvetica, Arial, sans-serif'),
  local("Verdana", "sans-serif", "Verdana, Geneva, sans-serif"),
  local("Georgia", "serif", 'Georgia, "Times New Roman", serif'),
  local("Palatino", "serif", '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'),
  local("Times New Roman", "serif", '"Times New Roman", Times, serif'),
  local("System mono", "monospace", "ui-monospace, var(--font-mono-fallback)"),
  local("Menlo", "monospace", "Menlo, Monaco, Consolas, monospace"),
  local("Courier New", "monospace", '"Courier New", Courier, monospace'),
];

function local(label: string, category: FontCategory, stack: string): FontOption {
  return { value: `local:${label}`, label, category, stack };
}

/** One family as the Google Fonts developer API lists it. */
export interface GoogleFontItem {
  family: string;
  category: string;
  variants: string[];
}

/** The weights the kit uses: body, strong, heading, and a bold step. */
const WANTED_WEIGHTS = [400, 500, 600, 700];

/**
 * Picks the first families of each category. The API sorts its list when
 * asked (ThemeBuilder.astro asks for `sort=popularity`), so the first matches
 * win. Only the weights the family ships are requested.
 */
export function pickGoogleFonts(items: readonly GoogleFontItem[], perCategory = 7): FontOption[] {
  const picked: FontOption[] = [];
  const counts = Object.fromEntries(FONT_CATEGORIES.map((c) => [c, 0])) as Record<
    FontCategory,
    number
  >;
  for (const item of items) {
    const category = item.category as FontCategory;
    if (!(category in counts) || counts[category] >= perCategory) continue;
    // Icon fonts (Material Icons, Material Symbols) list as monospace.
    if (/\b(Icons|Symbols)\b/.test(item.family)) continue;
    const weights = WANTED_WEIGHTS.filter((w) =>
      item.variants.includes(w === 400 ? "regular" : String(w)),
    );
    if (weights.length === 0) continue;
    counts[category]++;
    picked.push({
      value: item.family,
      label: item.family,
      category,
      stack: fontStack(item.family, category),
      google: item.family,
      weights,
    });
  }
  return picked;
}

/** The token value for a Google family: the quoted name ahead of the kit's fallback stack. */
export function fontStack(family: string, category: FontCategory): string {
  return `"${family}", ${FALLBACK[category]}`;
}

/**
 * One Google Fonts CSS2 URL loading every family at once, or null when there
 * is nothing to load. Families are deduped and sorted so the same choice
 * always builds the same URL.
 */
export function googleFontsHref(
  fonts: readonly { google?: string; weights?: number[] }[],
): string | null {
  const families = new Map<string, number[]>();
  for (const font of fonts) {
    if (!font.google) continue;
    const weights = new Set([...(families.get(font.google) ?? []), ...(font.weights ?? [400])]);
    families.set(
      font.google,
      [...weights].sort((a, b) => a - b),
    );
  }
  if (families.size === 0) return null;
  const params = [...families.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([family, weights]) => `family=${family.replaceAll(" ", "+")}:wght@${weights.join(";")}`);
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

export type FontRole = "heading" | "body";

/**
 * The categories that pair with the other role's font, best first, after
 * Google's "Pairing typefaces" guidance: contrast the classification (a serif
 * over a sans, or the reverse), keep display faces to headings over
 * a plain body, and set code-like monospace against a sans.
 */
const PAIRS: Record<FontRole, Record<FontCategory, readonly FontCategory[]>> = {
  // A body to go under a heading in this category.
  body: {
    serif: ["sans-serif", "serif"],
    "sans-serif": ["serif", "sans-serif"],
    display: ["sans-serif", "serif"],
    monospace: ["sans-serif", "serif"],
  },
  // A heading to go over a body in this category.
  heading: {
    serif: ["sans-serif", "display", "serif"],
    "sans-serif": ["serif", "display"],
    display: ["sans-serif", "serif"],
    monospace: ["sans-serif", "monospace"],
  },
};

/** How much more likely each tier of `PAIRS` is than the next. */
const TIER_WEIGHTS = [4, 2, 1];
/** How much more likely a font from the other's superfamily is. */
const SUPERFAMILY_WEIGHT = 3;

/**
 * A family name without its classification words and cut numbers: "Roboto
 * Slab" and "Roboto" share "Roboto", "Redaction 10" and "Redaction 35" share
 * "Redaction".
 */
function superfamily(label: string): string {
  return label
    .replace(/\b(Sans|Serif|Slab|Mono|Display|Text|Code|Condensed|\d+)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A font for `role` that pairs with `other`, the other role's font (null is
 * the kit's default, a system sans). The pick is random, weighted toward the
 * better categories in `PAIRS` and toward the other font's superfamily (Roboto
 * with Roboto Slab), which the guide calls the safest pairing. It never
 * returns `other` itself or `current`, so each call moves to a new font. Null
 * when no option fits.
 */
export function pairFont(
  role: FontRole,
  other: FontOption | null,
  options: readonly FontOption[],
  current?: string,
  random: () => number = Math.random,
): FontOption | null {
  const tiers = PAIRS[role][other?.category ?? "sans-serif"];
  const family = other ? superfamily(other.label) : "";
  const weighted: [FontOption, number][] = [];
  for (const option of options) {
    if (option.value === other?.value || option.value === current) continue;
    const tier = tiers.indexOf(option.category);
    if (tier < 0) continue;
    const kin = family !== "" && superfamily(option.label) === family;
    weighted.push([option, TIER_WEIGHTS[tier] * (kin ? SUPERFAMILY_WEIGHT : 1)]);
  }
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let at = random() * total;
  for (const [option, weight] of weighted) {
    at -= weight;
    if (at < 0) return option;
  }
  return weighted.at(-1)?.[0] ?? null;
}
