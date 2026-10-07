/**
 * Rows for the utility reference tables, read from the kit's utility table
 * (`base/utilities.ts`): the CSS it writes, what values it takes, and which
 * tiers it accepts.
 */
import {
  BREAKPOINTS,
  DISPLAY_SHORTHANDS,
  PSEUDO_ONLY,
  STATES,
  UTILITIES,
  tiersOf,
  type Utility,
} from "@zazz-ui/core/base/utilities.ts";

export interface UtilityRow {
  name: string;
  /** The CSS the utility writes, or what it feeds when it emits nothing itself. */
  properties: string;
  /** What the value may be. */
  value: string;
  /** Tier groups the utility accepts. */
  tiers: ("breakpoints" | "states")[];
  /** Keyword values and token shorthands, if any. */
  keywords: string[];
  /** Works at a tier without a base value (only meaningful when the utility takes tiers). */
  tierOnly: boolean;
  /** Also exists as `--before-<name>` / `--after-<name>`. */
  pseudo: boolean;
}

const VALUE_BY_MODE: Record<Utility["mode"], string> = {
  dual: "scale number or length",
  raw: "any CSS value",
  keyword: "keyword",
  integer: "integer",
};

/** Emission targets for utilities that write no property of their own. */
const FEEDS: Record<string, string> = {
  "bg-alpha": "alpha of --bg",
  "bg-linear": "background-image (linear-gradient)",
  "bg-radial": "background-image (radial-gradient)",
  "bg-conic": "background-image (conic-gradient)",
  "bg-stops": "the gradient's color stops",
  shadow: "box-shadow",
  ring: "box-shadow (ring width)",
  "ring-color": "box-shadow (ring color)",
  "ring-offset": "box-shadow (ring offset width)",
  "ring-offset-color": "box-shadow (ring offset color)",
  "shadow-hue": "the --shadow-* tokens on this subtree",
  divide: "border between direct children (divide-x / divide-y)",
  border: "border-width + border-color",
  "border-x": "border-inline width + color",
  "border-y": "border-block width + color",
  "border-l": "border-inline-start width + color",
  "border-r": "border-inline-end width + color",
  "border-t": "border-block-start width + color",
  "border-b": "border-block-end width + color",
};

/** Value notes for utilities whose accepted values go beyond their mode. */
const VALUE_NOTES: Record<string, string> = {
  display: `keyword, plus flex shorthands that set the direction: ${Object.keys(DISPLAY_SHORTHANDS).join(", ")}`,
  "grid-cols": "track count (equal tracks) or subgrid",
  "grid-rows": "track count (equal tracks) or subgrid",
  "col-span": "span count",
  "row-span": "span count",
  "grid-fit": "minimum track length (auto-fit columns)",
  "line-clamp": "line count (1 truncates)",
  "font-weight": "number, or strong / heading / body (the role weight tokens)",
  shadow: "shadow size by name (2xs … 2xl), a var(), or any box-shadow",
  border: "color (1px solid), number (px wide, --color-border), or length",
  "border-x": "color, number (px), or length",
  "border-y": "color, number (px), or length",
  "border-l": "color, number (px), or length",
  "border-r": "color, number (px), or length",
  "border-t": "color, number (px), or length",
  "border-b": "color, number (px), or length",
  divide: "color, number (px), or length; set on the container",
  bg: "color, or none (clears the color and any gradient)",
  "bg-alpha": "0 to 1, multiplied into --bg's alpha",
  "bg-linear": "gradient prelude: direction, in <color-space>",
  "bg-radial": "gradient prelude: shape, position, in <color-space>",
  "bg-conic": "gradient prelude: from <angle>, at <position>",
  "bg-stops": "comma-separated color stops",
  content: "a string ('') on --before-content / --after-content",
  "place-items": "alignment keyword (center, start, end, stretch, safe end, …)",
  "place-content": "alignment keyword (center, start, end, space-between, safe end, …)",
};

function tiersFor(u: Utility): UtilityRow["tiers"] {
  const tiers = tiersOf(u);
  const out: UtilityRow["tiers"] = [];
  if (tiers.some((t) => (BREAKPOINTS as readonly string[]).includes(t))) out.push("breakpoints");
  if (tiers.some((t) => (STATES as readonly string[]).includes(t))) out.push("states");
  return out;
}

export function utilityRow(u: Utility): UtilityRow {
  const keywords = [...(u.keywords ?? []), ...Object.keys(u.aliases ?? {})];
  const tiers = tiersFor(u);
  // Shadow and the ring utilities compose into one box-shadow that ends in a
  // literal, so they need no base either (SPEC §3).
  const composesWithDefault = u.emit === "none" && u.family === "effects";
  return {
    name: u.name,
    properties: u.properties.length > 0 ? u.properties.join(", ") : (FEEDS[u.name] ?? "—"),
    value: VALUE_NOTES[u.name] ?? VALUE_BY_MODE[u.mode],
    tiers,
    keywords,
    tierOnly: tiers.length > 0 && (u.noBase !== undefined || composesWithDefault),
    pseudo: u.pseudo === true,
  };
}

/** Rows for the named utilities, in the order given. */
export function utilityRows(names: readonly string[]): UtilityRow[] {
  const table = new Map([...UTILITIES, ...PSEUDO_ONLY].map((u) => [u.name, u]));
  return names.map((name) => {
    const u = table.get(name);
    if (!u) throw new Error(`utilityRows: "${name}" is not in the kit's utility table`);
    return utilityRow(u);
  });
}
