"use strict";

/**
 * @fileoverview Style prop registry — the single source of truth for the
 * 0.5.0 style props (ADR-0012).
 * @description A style prop is a custom property set in the `style` attribute
 * (`style="--px: 4"`) and read by a zero-specificity rule in
 * `@layer zazz.utilities` gated on the attribute text (`[style*="--px:"]`).
 * This module lists every prop (44, frozen in `.scratch/style-props/spec.md`),
 * the breakpoint suffixes each one takes, and renders the `@property`
 * registrations that `scripts/generate-properties.mjs` writes to
 * `src/base/_properties.css`. The utility files (`_utilities-<family>.css`)
 * are hand-written against this list; `props.test.ts` guards that every
 * registered name has its `[style*="--<name>:"]` gate in one of them and that
 * no gate names an unregistered prop, so a prop added or renamed here fails
 * until the CSS follows.
 *
 * Names are Tailwind roots with no prefix; the only suffix is a breakpoint
 * (`--px-md`). One exception: a root that collides with an existing token
 * family, directly or through its responsive forms (`--border`,
 * `--font-size-md`, `--leading-lg`…), takes the full CSS property name
 * instead (`border-color`, `line-height`, `letter-spacing`; `text-size` for
 * font-size), because a registered `inherits: false` name would break every
 * `var()` read of the token below `:root`. Registered names are global, so
 * the list is a published contract: adding a prop is additive, renaming or
 * removing one is breaking.
 *
 * @see ../../docs/adr/0012-style-props.md
 * @see ../../SPEC.md
 */

// --- Contract ---

/** @description Responsive suffixes, in ascending order: `--px-sm` … `--px-2xl`. */
const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"] as const;

type Breakpoint = (typeof BREAKPOINTS)[number];

/** @description The utility file a prop's rules live in (`_utilities-<family>.css`). */
type PropFamily = "spacing" | "sizing" | "grid" | "flex" | "color" | "typography" | "position";

/**
 * @description How a prop's value reaches its property: `step` multiplies by
 * `--spacing-interval` (`--p: 4` → `calc(4 * var(--spacing-interval))`),
 * `raw` passes the value through unchanged.
 */
type PropKind = "step" | "raw";

interface StyleProp {
  /** Family the prop belongs to; one utility file per family. */
  family: PropFamily;
  /** Root name without dashes: `px` is written `--px` inline, `--px-md` responsive. */
  name: string;
  /**
   * The CSS property the prop drives — the logical longhand where one exists
   * (`ps` → `padding-inline-start`, `left` → `inset-inline-start`); a shorthand
   * only where the prop sets every side (`p` → `padding`); two properties
   * where the prop sets both axes (`size` → `inline-size, block-size`).
   */
  property: string;
  /** Value treatment; see PropKind. */
  kind: PropKind;
}

/**
 * @description Expands one family's `[name, property]` pairs into registry
 * entries, so each family reads as a table.
 *
 * @param family - The family every entry belongs to.
 * @param kind - The value treatment shared by the family.
 * @param entries - `[name, property]` pairs in the frozen order.
 * @returns The family's entries.
 * @private
 */
function family(
  family: PropFamily,
  kind: PropKind,
  entries: ReadonlyArray<readonly [name: string, property: string]>,
): StyleProp[] {
  return entries.map(([name, property]) => ({ family, name, property, kind }));
}

// --- Registry ---

/**
 * @description The frozen prop list, in family order. Counts: spacing 17,
 * sizing 7, grid 4, flex 4, color 3, typography 3, position 6 = 44.
 */
const PROPS: readonly StyleProp[] = [
  // spacing — numeric, multiplied by --spacing-interval. `--gap` also sets --_gap.
  ...family("spacing", "step", [
    ["p", "padding"],
    ["px", "padding-inline"],
    ["py", "padding-block"],
    ["ps", "padding-inline-start"],
    ["pe", "padding-inline-end"],
    ["pt", "padding-block-start"],
    ["pb", "padding-block-end"],
    ["m", "margin"],
    ["mx", "margin-inline"],
    ["my", "margin-block"],
    ["ms", "margin-inline-start"],
    ["me", "margin-inline-end"],
    ["mt", "margin-block-start"],
    ["mb", "margin-block-end"],
    ["gap", "gap"],
    ["gap-x", "column-gap"],
    ["gap-y", "row-gap"],
  ]),
  // sizing — any length, percentage or keyword.
  ...family("sizing", "raw", [
    ["w", "inline-size"],
    ["h", "block-size"],
    ["min-w", "min-inline-size"],
    ["max-w", "max-inline-size"],
    ["min-h", "min-block-size"],
    ["max-h", "max-block-size"],
    ["size", "inline-size, block-size"],
  ]),
  // grid — `--grid-cols` implies display: grid and sets --_grid-cols.
  ...family("grid", "raw", [
    ["grid-cols", "grid-template-columns"],
    ["grid-rows", "grid-template-rows"],
    ["col-span", "grid-column"],
    ["row-span", "grid-row"],
  ]),
  // flex
  ...family("flex", "raw", [
    ["basis", "flex-basis"],
    ["grow", "flex-grow"],
    ["shrink", "flex-shrink"],
    ["order", "order"],
  ]),
  // color — `--text` is the text color, not a size. `border-color`, not the
  // root `border`: `--border` is the theme role token.
  ...family("color", "raw", [
    ["bg", "background-color"],
    ["text", "color"],
    ["border-color", "border-color"],
  ]),
  // typography — full property names: the roots' responsive forms
  // (`--font-size-md`, `--leading-lg`, `--tracking-sm`) are type-scale tokens.
  ...family("typography", "raw", [
    ["text-size", "font-size"],
    ["line-height", "line-height"],
    ["letter-spacing", "letter-spacing"],
  ]),
  // position — logical insets.
  ...family("position", "raw", [
    ["top", "inset-block-start"],
    ["right", "inset-inline-end"],
    ["bottom", "inset-block-end"],
    ["left", "inset-inline-start"],
    ["inset", "inset"],
    ["z", "z-index"],
  ]),
];

// --- Derived names ---

/**
 * @description Yields every registered custom property name: for each prop,
 * the base form then one per breakpoint (`--px`, `--px-sm`, … `--px-2xl`).
 * 44 props × 6 forms = 264 names, in registry order.
 *
 * @returns The custom property names, dashes included.
 * @example
 * [...propNames()].length; // 264
 */
function* propNames(): Generator<string, void, undefined> {
  for (const prop of PROPS) {
    yield `--${prop.name}`;
    for (const bp of BREAKPOINTS) yield `--${prop.name}-${bp}`;
  }
}

// --- _properties.css ---

/**
 * @description The CSSDoc header of the generated file. `@layer none`:
 * `@property` is layer-independent, so the file contributes to no cascade
 * layer.
 */
const PROPERTIES_HEADER = `/**
 * _properties.css — Style prop registrations (@property), one per prop × breakpoint.
 *
 * GENERATED from src/props.ts by scripts/generate-properties.mjs — do not edit
 * by hand. Regenerate with \`vp run properties\`; props.test.ts fails on drift.
 *
 * @layer      none — @property is layer-independent
 * @requires   none — @property is layer-independent (the documented exception
 *             to "always include layers.css")
 * @uses       @property — syntax "*" with no initial-value: the universal syntax
 *             keeps a prop guaranteed-invalid until the style attribute sets it,
 *             so an element with no prop matches no utility rule and needs no
 *             var() fallback (ADR-0012)
 * @uses       inherits: false — a prop set on a container never surfaces on its
 *             children; anything that must travel goes through the private
 *             coordination vars (--_gap, --_grid-cols) in _utilities.css
 * @consumedby _utilities-<family>.css — the eight style-prop files (spacing,
 *             spacing-responsive, sizing, grid, flex, color, typography,
 *             position); _variables.css loads before this file and reads
 *             nothing from it
 * @see        src/props.ts — the prop registry (names, families, kinds)
 * @see        docs/adr/0012-style-props.md
 */
`;

/** @description One-line family notes for the generated file's group comments. */
const FAMILY_NOTES: Record<PropFamily, string> = {
  spacing: "numeric, × --spacing-interval",
  sizing: "length, percentage or keyword",
  grid: "--grid-cols implies display: grid",
  flex: "flex item props",
  color: "--text is the text color",
  typography: "font-size, line-height, letter-spacing",
  position: "logical insets + z-index",
};

/**
 * @description Renders `src/base/_properties.css`: the CSSDoc header, then
 * one `@property --<name>[-<bp>] { syntax: "*"; inherits: false; }` block per
 * name from `propNames()`, grouped by family under a comment.
 *
 * `syntax: "*"` takes no `initial-value` on purpose — omitting it leaves the
 * property guaranteed-invalid, which is what the `[style*="--x:"]` gate relies
 * on (a registered value would otherwise be substituted into every var()).
 *
 * @returns The complete file contents.
 */
function propertiesCss(): string {
  const groups = new Map<PropFamily, string[]>();
  for (const prop of PROPS) {
    const names = [`--${prop.name}`, ...BREAKPOINTS.map((bp) => `--${prop.name}-${bp}`)];
    const blocks = names.map(
      (name) => `@property ${name} {\n  syntax: "*";\n  inherits: false;\n}\n`,
    );
    groups.set(prop.family, [...(groups.get(prop.family) ?? []), ...blocks]);
  }

  const sections = [...groups].map(
    ([family, blocks]) => `/* ${family} — ${FAMILY_NOTES[family]} */\n\n${blocks.join("\n")}`,
  );

  return `${PROPERTIES_HEADER}\n${sections.join("\n")}`;
}

export { BREAKPOINTS, PROPS, propNames, propertiesCss };
export type { Breakpoint, PropFamily, PropKind, StyleProp };
