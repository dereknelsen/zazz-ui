/**
 * The property-to-utility table: every CSS property the kit's utilities
 * write, with the utility that writes it, so a reader who knows CSS but not
 * Tailwind can look a utility up by the property. Rows come from the kit's
 * utility table (`base/utilities.ts`); the composites that write no property
 * of their own, and the physical property names people search for, are
 * listed by hand here.
 */
import { DISPLAY_SHORTHANDS, UTILITIES } from "@zazz-ui/core/base/utilities.ts";
import { utilityRow } from "./utilities.ts";

export interface FromCssRow {
  /** The CSS property as written in a stylesheet. */
  property: string;
  /** The utility, or utilities, that write it, as `--name` (with a value where the form matters). */
  utilities: string[];
  /** What the value may be, or where to look. */
  note: string;
}

/**
 * Properties a utility writes through a composite or a shorthand, so the kit's
 * table has no utility that names them directly.
 */
const COMPOSITES: FromCssRow[] = [
  {
    property: "box-shadow",
    utilities: ["--shadow", "--ring", "--ring-color", "--ring-offset", "--ring-offset-color"],
    note: "one box-shadow: the shadow (by name, 2xs to 2xl, or any value) and the ring",
  },
  {
    property: "flex-direction",
    utilities: Object.keys(DISPLAY_SHORTHANDS).map((keyword) => `--display: ${keyword}`),
    note: "the direction rides on --display; a plain flex at a tier resets it to row",
  },
  {
    property: "background-image",
    utilities: ["--bg-linear", "--bg-radial", "--bg-conic", "--bg-stops"],
    note: "a gradient: the type carries the prelude, --bg-stops the color stops; --bg: none clears it",
  },
  {
    property: "border",
    utilities: ["--border"],
    note: "a color (1px solid), a number (px wide in --color-border), or a length",
  },
  {
    property: "border-inline",
    utilities: ["--border-x"],
    note: "a color, a number (px), or a length; --border-y, --border-t, --border-r, --border-b, --border-l for the other sides",
  },
  {
    property: "outline (focus)",
    utilities: ["--focus-ring"],
    note: "a primitive's focus ring and a plain element's focus outline: a signed width, negative keeps it inside",
  },
];

/**
 * Physical property names and the logical property the kit writes instead,
 * so `width` finds `--w` and `padding-left` finds `--pl`.
 */
const PHYSICAL: Record<string, string> = {
  width: "inline-size",
  height: "block-size",
  "min-width": "min-inline-size",
  "max-width": "max-inline-size",
  "min-height": "min-block-size",
  "max-height": "max-block-size",
  "padding-left": "padding-inline-start",
  "padding-right": "padding-inline-end",
  "padding-top": "padding-block-start",
  "padding-bottom": "padding-block-end",
  "margin-left": "margin-inline-start",
  "margin-right": "margin-inline-end",
  "margin-top": "margin-block-start",
  "margin-bottom": "margin-block-end",
  top: "inset-block-start",
  bottom: "inset-block-end",
  left: "inset-inline-start",
  right: "inset-inline-end",
  "border-left": "border-inline-start",
  "border-right": "border-inline-end",
  "border-top": "border-block-start",
  "border-bottom": "border-block-end",
};

/** Border sides are written through the shorthands, which have no `properties` entry. */
const BORDER_SIDE_UTILITIES: Record<string, string> = {
  "border-inline-start": "--border-l",
  "border-inline-end": "--border-r",
  "border-block-start": "--border-t",
  "border-block-end": "--border-b",
};

/** Every row, sorted by property. */
export function fromCssRows(): FromCssRow[] {
  const byProperty = new Map<string, FromCssRow>();
  const add = (property: string, utility: string, note: string) => {
    const row = byProperty.get(property);
    if (row) row.utilities.push(utility);
    else byProperty.set(property, { property, utilities: [utility], note });
  };
  for (const utility of UTILITIES) {
    const { value } = utilityRow(utility);
    for (const property of utility.properties) add(property, `--${utility.name}`, value);
  }
  for (const [property, utility] of Object.entries(BORDER_SIDE_UTILITIES)) {
    add(property, utility, "a color, a number (px), or a length");
  }
  for (const row of COMPOSITES)
    byProperty.set(row.property, { ...row, utilities: [...row.utilities] });
  for (const [physical, logical] of Object.entries(PHYSICAL)) {
    const row = byProperty.get(logical);
    if (!row)
      throw new Error(`fromCssRows: ${physical} points at ${logical}, which no utility writes`);
    byProperty.set(physical, {
      property: physical,
      utilities: [...row.utilities],
      note: `${row.note}; writes ${logical}, so it follows the writing direction`,
    });
  }
  return [...byProperty.values()].sort((a, b) => a.property.localeCompare(b.property));
}
