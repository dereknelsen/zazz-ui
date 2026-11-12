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

/** The font categories the builder offers, in the order it groups them. */
export const FONT_CATEGORIES = ["sans-serif", "serif", "monospace"] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];

/** The kit's fallback stack for each category. */
const FALLBACK: Record<FontCategory, string> = {
  "sans-serif": "var(--font-sans-fallback)",
  serif: "var(--font-serif-fallback)",
  monospace: "var(--font-mono-fallback)",
};

/**
 * The Google families on offer, seven per category, curated from the
 * recommendations of Typewolf ("The 40 Best Free Fonts Available on Google
 * Fonts", 2026), SaaS Landing Page ("The 12 Most Popular Google Fonts for
 * Landing Pages", 2026), Leadpages ("The Best Google Font Pairings for 2026"),
 * and Lexington Themes ("Best Monospaced Google Fonts for 2026"). Every sans and
 * serif here is in at least one of `FONT_PAIRINGS`. Listed in combobox order.
 */
export const CURATED_FONTS: Readonly<Record<FontCategory, readonly string[]>> = {
  "sans-serif": ["Inter", "DM Sans", "Outfit", "Figtree", "Manrope", "Raleway", "Poppins"],
  serif: ["Lora", "Playfair Display", "Fraunces", "Bodoni Moda", "Prata", "Castoro", "Zilla Slab"],
  monospace: [
    "Space Mono",
    "Inconsolata",
    "Azeret Mono",
    "SUSE Mono",
    "Atkinson Hyperlegible Mono",
    "Google Sans Code",
    "Geist Mono",
  ],
};

/**
 * The heading-over-body pairings the same sources recommend, among
 * `CURATED_FONTS`. The wand and the dice favor these over any other match.
 */
export const FONT_PAIRINGS: readonly (readonly [heading: string, body: string])[] = [
  ["Lora", "Outfit"],
  ["Lora", "DM Sans"],
  ["Castoro", "Inter"],
  ["Castoro", "Figtree"],
  ["Playfair Display", "Raleway"],
  ["Bodoni Moda", "Raleway"],
  ["Fraunces", "Poppins"],
  ["Prata", "Manrope"],
  ["Outfit", "Zilla Slab"],
];

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
 * The `CURATED_FONTS` the API lists, in curated order, with the curated
 * category (the API files some monospace families elsewhere). Only the
 * weights the family ships are requested, and a family the API does not list,
 * or that ships none of the wanted weights, is left out.
 */
export function pickGoogleFonts(
  items: readonly GoogleFontItem[],
  curated: Readonly<Record<FontCategory, readonly string[]>> = CURATED_FONTS,
): FontOption[] {
  const byFamily = new Map(items.map((item) => [item.family, item]));
  return FONT_CATEGORIES.flatMap((category) =>
    curated[category].flatMap((family) => {
      const item = byFamily.get(family);
      const weights = WANTED_WEIGHTS.filter((w) =>
        item?.variants.includes(w === 400 ? "regular" : String(w)),
      );
      if (!item || weights.length === 0) return [];
      return [
        {
          value: family,
          label: family,
          category,
          stack: fontStack(family, category),
          google: family,
          weights,
        },
      ];
    }),
  );
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
 * over a sans, or the reverse), and set code-like monospace against a sans.
 */
const PAIRS: Record<FontRole, Record<FontCategory, readonly FontCategory[]>> = {
  // A body to go under a heading in this category.
  body: {
    serif: ["sans-serif", "serif"],
    "sans-serif": ["serif", "sans-serif"],
    monospace: ["sans-serif", "serif"],
  },
  // A heading to go over a body in this category.
  heading: {
    serif: ["sans-serif", "serif"],
    "sans-serif": ["serif", "sans-serif"],
    monospace: ["sans-serif", "monospace"],
  },
};

/** How much more likely each tier of `PAIRS` is than the next. */
const TIER_WEIGHTS = [4, 2, 1];
/** How much more likely a font from the other's superfamily is. */
const SUPERFAMILY_WEIGHT = 3;
/** How much more likely a recommended pairing (`FONT_PAIRINGS`) is. */
const PAIRING_WEIGHT = 12;

/** Whether `FONT_PAIRINGS` recommends `font` in `role` with `other` in the other role. */
function recommended(role: FontRole, font: string, other: string): boolean {
  return FONT_PAIRINGS.some(([heading, body]) =>
    role === "heading" ? heading === font && body === other : body === font && heading === other,
  );
}

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
 * the kit's default, a system sans). The pick is random, weighted heavily
 * toward the recommended `FONT_PAIRINGS`, then toward the better categories in
 * `PAIRS` and the other font's superfamily (Roboto with Roboto Slab), which
 * the guide calls the safest pairing. It never
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
    const paired = other !== null && recommended(role, option.value, other.value);
    weighted.push([
      option,
      TIER_WEIGHTS[tier] * (kin ? SUPERFAMILY_WEIGHT : 1) * (paired ? PAIRING_WEIGHT : 1),
    ]);
  }
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let at = random() * total;
  for (const [option, weight] of weighted) {
    at -= weight;
    if (at < 0) return option;
  }
  return weighted.at(-1)?.[0] ?? null;
}

/** How often the dice take a recommended pairing outright rather than pairing a random heading. */
const RECOMMENDED_SHARE = 0.75;

/**
 * A heading and a body for the dice. Most of the time one of the
 * `FONT_PAIRINGS` whose fonts are both on offer; otherwise a heading from any
 * category and a body that pairs with it (`pairFont`, which still favors the
 * recommendations). Null when nothing is on offer.
 */
export function randomPairing(
  options: readonly FontOption[],
  random: () => number = Math.random,
): { heading: FontOption; body: FontOption | null } | null {
  const find = (value: string) => options.find((o) => o.value === value);
  const offered = FONT_PAIRINGS.flatMap(([h, b]) => {
    const heading = find(h);
    const body = find(b);
    return heading && body ? [{ heading, body }] : [];
  });
  if (offered.length > 0 && random() < RECOMMENDED_SHARE) {
    return offered[Math.min(offered.length - 1, Math.floor(random() * offered.length))];
  }
  if (options.length === 0) return null;
  const heading = options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  return { heading, body: pairFont("body", heading, options, undefined, random) };
}
