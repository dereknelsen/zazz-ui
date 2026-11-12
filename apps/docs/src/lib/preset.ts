/**
 * The theme builder's share code: every control packed into one short,
 * URL-safe string for `?preset=…`, the way shadcn/ui shares its themes.
 *
 * Each control maps to a whole number below its `size` (an option index, a
 * slider step, a hex color's 24 bits, a font's 16-bit hash), the numbers are
 * packed into one big integer in a fixed order (mixed radix), and that is
 * written in base 62 after a version character. The order and the sizes are
 * the format: changing either means a new `VERSION`, with the old schema kept
 * in `SCHEMAS` so old links still decode rather than misread.
 *
 * Fonts are stored by a hash of their family name, not their place in the
 * list, so a link keeps its fonts when a later build's font list changes;
 * a family no longer on offer comes back as the default.
 */
import { CORNER_SHAPE } from "./corner-shape.ts";
import { SCALE_STEPS } from "./fonts.ts";
import { BACKGROUNDS, normalizeHex } from "./palette.ts";

/** How one control turns into a number below `size` and back. */
interface Codec {
  size: number;
  toInt(value: string): number;
  fromInt(n: number, fonts: readonly string[]): string;
}

const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));

const hex: Codec = {
  size: 2 ** 24,
  toInt: (value) => Number.parseInt((normalizeHex(value) ?? "#000000").slice(1), 16),
  fromInt: (n) => `#${n.toString(16).padStart(6, "0")}`,
};

/** One of a fixed list of values; an unknown value reads as the first. */
const list = (values: readonly string[]): Codec => ({
  size: values.length,
  toInt: (value) => Math.max(0, values.indexOf(value)),
  fromInt: (n) => values[n],
});

/** A slider: a step on the grid from `min` to `max`. These match the inputs in ThemeBuilder.astro. */
const grid = (min: number, max: number, step: number): Codec => {
  const size = Math.round((max - min) / step) + 1;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return {
    size,
    toInt: (value) => clamp(Math.round((Number(value) - min) / step), size - 1) || 0,
    fromInt: (n) => String(Number((min + n * step).toFixed(decimals))),
  };
};

/** A 16-bit hash of a font's value (FNV-1a), never 0, which stands for the default font. */
export function fontHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % 0xffff) + 1;
}

const font: Codec = {
  size: 2 ** 16,
  toInt: (value) => (value ? fontHash(value) : 0),
  fromInt: (n, fonts) => (n ? (fonts.find((f) => fontHash(f) === n) ?? "") : ""),
};

const scale = list(SCALE_STEPS.map((s) => String(s.value)));

type Schema = readonly (readonly [string, Codec])[];

/** The controls by form field name, in packing order. Part of the format: see `VERSION`. */
const SCHEMA: Schema = [
  ["primary-hex", hex],
  ["secondary-hex", hex],
  ["tertiary-hex", hex],
  ["neutral-hex", hex],
  ["bg-light", list(BACKGROUNDS.light)],
  ["bg-dark", list(BACKGROUNDS.dark)],
  ["font-heading", font],
  ["font-body", font],
  ["scale-min", scale],
  ["scale-max", scale],
  ["spacing", grid(0, 2, 0.01)],
  ["radius", grid(0, 3, 0.25)],
  ["corner-shape", grid(CORNER_SHAPE.min, CORNER_SHAPE.max, CORNER_SHAPE.step)],
  ["card-elevation", grid(0, 8, 0.5)],
  ["shadow-angle", grid(0, 360, 15)],
  ["shadow-intensity", grid(0, 3, 0.1)],
  ["shadow-blur", grid(0, 3, 0.1)],
  ["shadow-distance", grid(0, 3, 0.1)],
  ["shadow-color", hex],
];

/** The format's version, the code's first character. */
const VERSION = "2";

/**
 * Every schema a code may have been written with, by version. Version 1 had
 * no secondary or tertiary color (the form keeps those two at their defaults)
 * and a corner-shape slider from -2 to 4 (a value past 3 now reads as infinity).
 */
const SCHEMAS: Readonly<Record<string, Schema>> = {
  "1": SCHEMA.filter(([name]) => name !== "secondary-hex" && name !== "tertiary-hex").map(
    ([name, codec]) => [name, name === "corner-shape" ? grid(-2, 4, 0.1) : codec] as const,
  ),
  [VERSION]: SCHEMA,
};

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = BigInt(DIGITS.length);
/** One past the largest packed number: a bigger one is not a code that schema wrote. */
const limit = (schema: Schema) =>
  schema.reduce((total, [, codec]) => total * BigInt(codec.size), 1n);

/** Packs the form's values (by field name) into a share code. */
export function encodePreset(values: Readonly<Record<string, string>>): string {
  let n = 0n;
  for (const [name, codec] of SCHEMA) {
    n = n * BigInt(codec.size) + BigInt(codec.toInt(values[name] ?? ""));
  }
  let digits = "";
  do {
    digits = DIGITS[Number(n % BASE)] + digits;
    n /= BASE;
  } while (n > 0n);
  return VERSION + digits;
}

/**
 * The form's values (by field name) from a share code, or null when the code
 * is not one a known version wrote. `fonts` are the font values on offer, to
 * match the stored hashes against.
 */
export function decodePreset(
  code: string,
  fonts: readonly string[],
): Record<string, string> | null {
  const schema = SCHEMAS[code[0]];
  if (code.length < 2 || !schema) return null;
  let n = 0n;
  for (const char of code.slice(1)) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0) return null;
    n = n * BASE + BigInt(digit);
  }
  if (n >= limit(schema)) return null;
  const values: Record<string, string> = {};
  for (const [name, codec] of [...schema].reverse()) {
    const size = BigInt(codec.size);
    values[name] = codec.fromInt(Number(n % size), fonts);
    n /= size;
  }
  return values;
}
