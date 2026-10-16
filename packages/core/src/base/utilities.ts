"use strict";

/**
 * @fileoverview The utility table: the single source the utilities generator,
 * the editor custom data, and `<ui-debug>` read. Data only — no imports, no
 * CSS text.
 */

/** Breakpoints, ascending: Tailwind's five names. */
export const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/**
 * Breakpoint thresholds and layout widths, in rem: Tailwind's scale. A tier
 * applies when the nearest inline-size container is at least this wide, and
 * `--layout-<breakpoint>` is the same width, so `@md` means "an md band fits".
 * rem resolves against the root in every container, so siblings in different
 * fonts flip together; it still follows the reader's font size and zoom.
 * 640 / 768 / 1024 / 1280 / 1536px at 16px.
 */
export const BREAKPOINT_REM: Record<Breakpoint, number> = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  "2xl": 96,
};

/** Interaction states, highest precedence first. */
export const STATES = [
  "starting",
  "disabled",
  "active",
  "focus-visible",
  "focus-within",
  "hover",
  "checked",
  "current",
  "open",
  "stuck",
] as const;
export type State = (typeof STATES)[number];

/**
 * How each state is selected: a pseudo-class (or `:is()` list) on the element,
 * with an optional media guard; for `stuck`, the nearest sticky scroll-state
 * container (see `STUCK_STATE`); for `starting`, the element's
 * `@starting-style` (the style it transitions from when it first renders or
 * leaves `display: none`). Pseudo states have a `--group-*` form; the stuck
 * and starting states do not (the trigger is the container, or the element's
 * own first style).
 */
export const STATE_SELECTORS: Record<
  State,
  { pseudo: string; media?: string; stuck?: true; starting?: true }
> = {
  starting: { pseudo: "", starting: true },
  disabled: { pseudo: ':is(:disabled, [aria-disabled="true"])' },
  active: { pseudo: ":active" },
  "focus-visible": { pseudo: ":focus-visible" },
  "focus-within": { pseudo: ":focus-within" },
  hover: { pseudo: ":hover", media: "(hover: hover)" },
  checked: { pseudo: ':is(:checked, [aria-checked="true"])' },
  current: { pseudo: ':is([aria-current]:not([aria-current="false"]))' },
  open: { pseudo: ':is([open], :popover-open, [aria-expanded="true"])' },
  stuck: { pseudo: "", stuck: true },
};

/**
 * The experimental `stuck` state: `scroll-state(stuck: <side>)` where container
 * scroll-state queries are supported, `base/scroll-state.ts` elsewhere. Any
 * sticky element (a `style` holding `: sticky`, so `--position: sticky`, its
 * tiers, or raw `position: sticky`) or one that sets `--stuck-state` becomes
 * the container; a container query never matches the container itself, so
 * `--<utility>--stuck` applies to its *descendants* while it is stuck to the
 * side its `--stuck-state` names (`fallback` when unset). `--stuck-state` has
 * no emission or tiers of its own: switch `--position` off at a breakpoint to
 * drop the state there.
 */
export const STUCK_STATE = {
  modifier: "stuck-state",
  supports: "(container-type: scroll-state)",
  /** Where unsupported, `base/scroll-state.ts` writes the stuck sides here, on the container. */
  polyfill: "data-ui-stuck",
  fallback: "top",
  /** Sticky elements: `--position: sticky`, its tiers, or raw `position: sticky`. */
  sticky: '[style*=": sticky"]',
  sides: [
    "top",
    "right",
    "bottom",
    "left",
    "block-start",
    "block-end",
    "inline-start",
    "inline-end",
  ],
} as const;

/** True when `--group-<utility>--<state>` exists for the state. */
export function hasGroup(state: State): boolean {
  return !STATE_SELECTORS[state].stuck && !STATE_SELECTORS[state].starting;
}

export function isState(tier: string): tier is State {
  return (STATES as readonly string[]).includes(tier);
}

/** How a utility's value is read. */
export type Mode = "dual" | "raw" | "keyword" | "integer";

/** Utility families; each family has one tier kind. */
export type Family =
  | "flow"
  | "grid"
  | "spacing"
  | "margin"
  | "sizing"
  | "typography"
  | "color"
  | "effects"
  | "box";

/** A family's tiers: breakpoints, states, both (paint that also changes per breakpoint), or none. */
export type Tiers = "breakpoints" | "states" | "both" | "none";

export const FAMILY_TIERS: Record<Family, Tiers> = {
  flow: "breakpoints",
  grid: "breakpoints",
  spacing: "breakpoints",
  margin: "breakpoints",
  sizing: "breakpoints",
  typography: "breakpoints",
  color: "both",
  effects: "states",
  box: "none",
};

export interface Utility {
  /** The name after `--` (`w`, `grid-cols`). */
  name: string;
  /** CSS properties the utility emits (several for `--size`). */
  properties: readonly string[];
  mode: Mode;
  family: Family;
  /**
   * Special emission shapes: `repeat` wraps an integer in
   * `repeat(n, minmax(0, 1fr))`; `span` writes `span n / span n`; `grid-fit` packs auto-fit columns;
   * `line-clamp` adds the -webkit-box companions; `bg` is a relative oklch
   * with `--bg-alpha`; `none` feeds a composite (`box-shadow`) and emits nothing itself;
   * `border` is a border shorthand: it sorts a color, number, or length into
   * width and color channels, and the side rules emit them. `px` feeds a
   * composite too, as one signed length `--_<name>-w`: a number is that many
   * pixels, a length passes through, and the sign carries meaning (a negative
   * ring is inset).
   */
  emit?: "plain" | "repeat" | "span" | "grid-fit" | "line-clamp" | "bg" | "none" | "border" | "px";
  /**
   * What the precedence chain ends in when neither the base nor an active tier
   * sets the utility: a `px` utility that stands in for a token (`--focus-ring`
   * falls back to `--ring-width`, so `--focus-ring--md: -2` alone keeps the
   * default ring below md).
   */
  chainEnd?: string;
  /** Overrides the family's tier kind (`none` for a utility that is base-only). */
  tiers?: Tiers;
  /**
   * The `border` emission's width and color channels (`--_<name>-w`, `--_<name>-c`)
   * inherit, for a switch that draws them on the element's children (`--divide`).
   */
  inherits?: true;
  /**
   * What a dual utility's number multiplies (default `var(--spacing)`):
   * `--radius: 2` is two steps of `--spacing` times `--radius-multiplier`.
   */
  scale?: string;
  /**
   * No-base allowlist: the CSS initial value as a literal. A utility with
   * `noBase` applies a tier without a base value wherever no kit rule sets its
   * property (the tier-only rule is in `@layer defaults`, which they beat).
   */
  noBase?: string;
  /**
   * Keywords the typed emission (the dual pair, or an integer's `repeat()`)
   * cannot carry. A utility written with one of its keywords, at the base or
   * any tier, switches to its raw emission at every tier; its other values on
   * that element must then be valid as written (a length, not a scale number).
   * Other utilities on the element are unaffected.
   */
  keywords?: readonly string[];
  /**
   * The utility also exists as `--before-<name>` / `--after-<name>`,
   * read on the pseudo-element with an exact gate. Pseudo utilities are never
   * registered, because `::before` must inherit them from its host.
   */
  pseudo?: true;
  /**
   * Keyword shorthands: `--font-weight: strong` reads as `var(--font-weight-strong)`.
   * Each is an exact-value rule at the base and at every tier of the family, so
   * it works in `--font-weight--md: strong` too; any other value passes through as
   * usual. A keyword that is a prefix of another must come first.
   */
  aliases?: Readonly<Record<string, string>>;
}

/**
 * The utilities that compose into one `box-shadow` (ring and shadow): the
 * composite's chains all end in a literal, so a tier alone works on them, like
 * a no-base utility.
 */
export const BOX_SHADOW_COMPOSITE = [
  "shadow",
  "ring",
  "ring-color",
  "ring-offset",
  "ring-offset-color",
] as const;

/**
 * The shorthands whose base a longhand's tier overrides, nearest first: `--p: 4;
 * --px--md: 1` pads 4 below md and 1 inline from md. A shorthand's base is a
 * base for its longhands' tiers.
 */
export const SHORTHAND_OF: Readonly<Record<string, readonly string[]>> = {
  px: ["p"],
  py: ["p"],
  pt: ["py", "p"],
  pb: ["py", "p"],
  pl: ["px", "p"],
  pr: ["px", "p"],
  "gap-x": ["gap"],
  "gap-y": ["gap"],
  basis: ["flex"],
  shrink: ["flex"],
  "radius-t": ["radius"],
  "radius-b": ["radius"],
  "radius-l": ["radius"],
  "radius-r": ["radius"],
};

/**
 * The utilities that compose into one `filter`: `--filter` and `--elevation`
 * (a height drawn as drop-shadows), so neither removes the other.
 */
export const FILTER_COMPOSITE = ["filter", "elevation"] as const;

/** Gradient types: `--bg-<type>` emits `<type>-gradient(<prelude>, <--bg-stops>)`. */
export const GRADIENT_TYPES = ["linear", "radial", "conic"] as const;

/**
 * `--font-weight: strong` → `var(--font-weight-strong)`: the role weights, so a
 * theme's weights reach utilities. Standard names (`medium`) are not keywords:
 * write the number (`500`); `<ui-debug>` says so.
 */
const FONT_WEIGHTS = {
  heading: "var(--font-weight-heading)",
  body: "var(--font-weight-body)",
  strong: "var(--font-weight-strong)",
} as const;

/** Standard weight names and the number to write instead (`normal` and `bold` are CSS). */
export const FONT_WEIGHT_NAMES: Readonly<Record<string, number>> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  "extra-light": 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  "semi-bold": 600,
  demibold: 600,
  extrabold: 800,
  "extra-bold": 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

/**
 * `--display` shorthands that set the flex direction with the display (there
 * is no `--flex-direction` utility): `[display, flex-direction]`. Plain `flex`
 * or `inline-flex` at a tier resets the direction to row. A keyword that is a
 * prefix of another comes first.
 */
export const DISPLAY_SHORTHANDS: Readonly<Record<string, readonly [string, string]>> = {
  "flex-row": ["flex", "row"],
  "flex-row-reverse": ["flex", "row-reverse"],
  "flex-col": ["flex", "column"],
  "flex-col-reverse": ["flex", "column-reverse"],
  "inline-flex-row": ["inline-flex", "row"],
  "inline-flex-row-reverse": ["inline-flex", "row-reverse"],
  "inline-flex-col": ["inline-flex", "column"],
  "inline-flex-col-reverse": ["inline-flex", "column-reverse"],
};

/** The border shorthands, all sides first. */
export const BORDER_SHORTHANDS = [
  "border",
  "border-x",
  "border-y",
  "border-l",
  "border-t",
  "border-r",
  "border-b",
] as const;

/**
 * Each physical side of the border shorthand, the logical property prefix it
 * sets, and the shorthands that cover it, most specific first.
 */
export const BORDER_SIDES = [
  { side: "l", property: "border-inline-start", shorthands: ["border-l", "border-x", "border"] },
  { side: "t", property: "border-block-start", shorthands: ["border-t", "border-y", "border"] },
  { side: "r", property: "border-inline-end", shorthands: ["border-r", "border-x", "border"] },
  { side: "b", property: "border-block-end", shorthands: ["border-b", "border-y", "border"] },
] as const;

/** The four sizing keywords. Margin takes only `auto`. */
export const SIZING_KEYWORDS = ["auto", "fit-content", "min-content", "max-content"] as const;
export const MARGIN_KEYWORDS = ["auto"] as const;

/**
 * Track-list keywords `--grid-cols` / `--grid-rows` take besides a count. `none`
 * is not one: `--template-cols: none` says the same, and every keyword
 * costs a rule per breakpoint (SPEC claim 16).
 */
export const GRID_TEMPLATE_KEYWORDS = ["subgrid"] as const;

/** The utility table. Order within a family is emission order (shorthands first). */
export const UTILITIES: readonly Utility[] = [
  // flow: keywords and raw values; most are on the no-base allowlist
  { name: "display", pseudo: true, properties: ["display"], mode: "keyword", family: "flow" },
  // breakpoint tiers so sticky (and the stuck state) can switch off per breakpoint
  {
    name: "position",
    pseudo: true,
    properties: ["position"],
    mode: "keyword",
    family: "flow",
    noBase: "static",
  },
  // anchor positioning: states and breakpoints, so the hovered (or open, or
  // current) element can claim the anchor a toolbar or popover is tethered to.
  // `normal` is position-anchor's initial value. Engines on the older draft
  // don't know it, so the declaration is invalid at computed-value time and
  // falls back to their initial value, `auto`.
  {
    name: "anchor-name",
    properties: ["anchor-name"],
    mode: "raw",
    family: "flow",
    tiers: "both",
    noBase: "none",
  },
  {
    name: "position-anchor",
    properties: ["position-anchor"],
    mode: "raw",
    family: "flow",
    tiers: "both",
    noBase: "normal",
  },
  // where the tethered element sits on its anchor's 3×3 grid (`block-start
  // span-inline-end`); a popover keeps its own area under a tier alone
  {
    name: "position-area",
    properties: ["position-area"],
    mode: "raw",
    family: "flow",
    tiers: "both",
    noBase: "none",
  },
  {
    name: "flex-wrap",
    properties: ["flex-wrap"],
    mode: "keyword",
    family: "flow",
    noBase: "nowrap",
  },
  {
    name: "grid-flow",
    properties: ["grid-auto-flow"],
    mode: "keyword",
    family: "flow",
    noBase: "row",
  },
  {
    name: "auto-cols",
    properties: ["grid-auto-columns"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
  },
  {
    name: "auto-rows",
    properties: ["grid-auto-rows"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
  },
  { name: "items", properties: ["align-items"], mode: "keyword", family: "flow", noBase: "normal" },
  {
    name: "justify",
    properties: ["justify-content"],
    mode: "keyword",
    family: "flow",
    noBase: "normal",
  },
  // Grid alignment shorthands: the CSS alignment keywords only (`center`, `safe end`, `space-between`).
  {
    name: "place-items",
    properties: ["place-items"],
    mode: "keyword",
    family: "flow",
    noBase: "normal",
  },
  {
    name: "place-content",
    properties: ["place-content"],
    mode: "keyword",
    family: "flow",
    noBase: "normal",
  },
  { name: "self", properties: ["align-self"], mode: "keyword", family: "flow", noBase: "auto" },
  { name: "flex", properties: ["flex"], mode: "raw", family: "flow", noBase: "0 1 auto" },
  // after --flex, so its base beats the shorthand's
  { name: "shrink", properties: ["flex-shrink"], mode: "raw", family: "flow", noBase: "1" },
  { name: "basis", properties: ["flex-basis"], mode: "raw", family: "flow", noBase: "auto" },
  { name: "order", properties: ["order"], mode: "raw", family: "flow", noBase: "0" },
  // a layout child's band (`layout-md`); any grid-column value works
  {
    name: "band",
    properties: ["grid-column"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
  },
  // Tailwind's col-span / col-start / col-end (and row-*): span is a count,
  // start and end are line numbers; start and end follow span so they combine
  {
    name: "col-span",
    properties: ["grid-column"],
    mode: "integer",
    family: "flow",
    emit: "span",
    noBase: "1",
  },
  {
    name: "col-start",
    properties: ["grid-column-start"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
  },
  {
    name: "col-end",
    properties: ["grid-column-end"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
  },
  {
    name: "row-span",
    properties: ["grid-row"],
    mode: "integer",
    family: "flow",
    emit: "span",
    noBase: "1",
  },
  {
    name: "row-start",
    properties: ["grid-row-start"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
  },
  { name: "row-end", properties: ["grid-row-end"], mode: "raw", family: "flow", noBase: "auto" },
  // grid: integers become repeat() (plus subgrid); templates are raw;
  // grid-fit packs auto-fit columns
  {
    name: "grid-cols",
    properties: ["grid-template-columns"],
    mode: "integer",
    family: "grid",
    emit: "repeat",
    noBase: "1",
    keywords: GRID_TEMPLATE_KEYWORDS,
  },
  {
    name: "grid-rows",
    properties: ["grid-template-rows"],
    mode: "integer",
    family: "grid",
    emit: "repeat",
    noBase: "1",
    keywords: GRID_TEMPLATE_KEYWORDS,
  },
  // raw track lists take states too, for the 0fr → 1fr expand (`--template-rows--open: 1fr`)
  {
    name: "template-cols",
    properties: ["grid-template-columns"],
    mode: "raw",
    family: "grid",
    tiers: "both",
    noBase: "none",
  },
  {
    name: "template-rows",
    properties: ["grid-template-rows"],
    mode: "raw",
    family: "grid",
    tiers: "both",
    noBase: "none",
  },
  {
    name: "grid-fit",
    properties: ["grid-template-columns"],
    mode: "raw",
    family: "grid",
    emit: "grid-fit",
  },
  // spacing: dual mode; padding and gap are on the no-base allowlist (the reset
  // zeroes padding, so `--px--md: 8` alone pads from md)
  ...(
    [
      ["p", "padding"],
      ["px", "padding-inline"],
      ["py", "padding-block"],
      ["pt", "padding-block-start"],
      ["pb", "padding-block-end"],
      ["pl", "padding-inline-start"],
      ["pr", "padding-inline-end"],
    ] as const
  ).map(
    ([name, property]): Utility => ({
      name,
      pseudo: true,
      properties: [property],
      mode: "dual",
      family: "spacing",
      noBase: "0",
    }),
  ),
  { name: "gap", properties: ["gap"], mode: "dual", family: "spacing", noBase: "0" },
  { name: "gap-x", properties: ["column-gap"], mode: "dual", family: "spacing", noBase: "0" },
  { name: "gap-y", properties: ["row-gap"], mode: "dual", family: "spacing", noBase: "0" },
  { name: "inset", pseudo: true, properties: ["inset"], mode: "dual", family: "spacing" },
  // axis insets: left + right and top + bottom (logical, like the sides)
  { name: "inset-x", pseudo: true, properties: ["inset-inline"], mode: "dual", family: "spacing" },
  { name: "inset-y", pseudo: true, properties: ["inset-block"], mode: "dual", family: "spacing" },
  { name: "top", pseudo: true, properties: ["inset-block-start"], mode: "dual", family: "spacing" },
  {
    name: "bottom",
    pseudo: true,
    properties: ["inset-block-end"],
    mode: "dual",
    family: "spacing",
  },
  {
    name: "left",
    pseudo: true,
    properties: ["inset-inline-start"],
    mode: "dual",
    family: "spacing",
  },
  {
    name: "right",
    pseudo: true,
    properties: ["inset-inline-end"],
    mode: "dual",
    family: "spacing",
  },
  // margin: dual mode plus `auto`
  { name: "m", properties: ["margin"], mode: "dual", family: "margin", keywords: MARGIN_KEYWORDS },
  {
    name: "mx",
    properties: ["margin-inline"],
    mode: "dual",
    family: "margin",
    keywords: MARGIN_KEYWORDS,
  },
  {
    name: "my",
    properties: ["margin-block"],
    mode: "dual",
    family: "margin",
    keywords: MARGIN_KEYWORDS,
  },
  {
    name: "mt",
    properties: ["margin-block-start"],
    mode: "dual",
    family: "margin",
    keywords: MARGIN_KEYWORDS,
  },
  {
    name: "mb",
    properties: ["margin-block-end"],
    mode: "dual",
    family: "margin",
    keywords: MARGIN_KEYWORDS,
  },
  {
    name: "ml",
    properties: ["margin-inline-start"],
    mode: "dual",
    family: "margin",
    keywords: MARGIN_KEYWORDS,
  },
  {
    name: "mr",
    properties: ["margin-inline-end"],
    mode: "dual",
    family: "margin",
    keywords: MARGIN_KEYWORDS,
  },
  // sizing: dual mode; the four keywords only where they are used (`--w`, `--h`,
  // `--min-w`, `--max-w`): each keyword-bearing utility costs a base rule and two
  // rules per breakpoint (SPEC claim 16). `--size: fit-content` is `--w` + `--h`;
  // a hero that must not squish is `--min-h: 100svh`, not `--h: 100svh; --min-h: fit-content`
  {
    name: "w",
    properties: ["inline-size"],
    mode: "dual",
    family: "sizing",
    keywords: SIZING_KEYWORDS,
    pseudo: true,
  },
  {
    name: "h",
    properties: ["block-size"],
    mode: "dual",
    family: "sizing",
    keywords: SIZING_KEYWORDS,
    pseudo: true,
  },
  {
    name: "size",
    properties: ["inline-size", "block-size"],
    mode: "dual",
    family: "sizing",
    pseudo: true,
  },
  {
    name: "min-w",
    properties: ["min-inline-size"],
    mode: "dual",
    family: "sizing",
    keywords: SIZING_KEYWORDS,
    pseudo: true,
  },
  {
    name: "max-w",
    properties: ["max-inline-size"],
    mode: "dual",
    family: "sizing",
    keywords: SIZING_KEYWORDS,
    pseudo: true,
  },
  {
    name: "min-h",
    properties: ["min-block-size"],
    mode: "dual",
    family: "sizing",
    pseudo: true,
  },
  {
    name: "max-h",
    properties: ["max-block-size"],
    mode: "dual",
    family: "sizing",
    pseudo: true,
  },
  {
    name: "aspect",
    pseudo: true,
    properties: ["aspect-ratio"],
    mode: "raw",
    family: "sizing",
    noBase: "auto",
  },
  // typography: one utility per property; roles live in _typography.css
  { name: "font-size", pseudo: true, properties: ["font-size"], mode: "raw", family: "typography" },
  {
    name: "font-weight",
    pseudo: true,
    properties: ["font-weight"],
    mode: "raw",
    family: "typography",
    aliases: FONT_WEIGHTS,
  },
  { name: "font-family", properties: ["font-family"], mode: "raw", family: "typography" },
  { name: "font-style", properties: ["font-style"], mode: "keyword", family: "typography" },
  { name: "leading", properties: ["line-height"], mode: "raw", family: "typography" },
  { name: "tracking", properties: ["letter-spacing"], mode: "raw", family: "typography" },
  {
    name: "text-align",
    properties: ["text-align"],
    mode: "keyword",
    family: "typography",
    noBase: "start",
  },
  { name: "text-transform", properties: ["text-transform"], mode: "keyword", family: "typography" },
  {
    name: "text-wrap",
    properties: ["text-wrap"],
    mode: "keyword",
    family: "typography",
    noBase: "wrap",
  },
  {
    name: "line-clamp",
    properties: ["-webkit-line-clamp"],
    mode: "integer",
    family: "typography",
    emit: "line-clamp",
  },
  // states too, for the link pattern `--text-decoration--hover: underline`
  {
    name: "text-decoration",
    properties: ["text-decoration-line"],
    mode: "raw",
    family: "typography",
    tiers: "both",
    noBase: "none",
  },
  { name: "whitespace", properties: ["white-space"], mode: "keyword", family: "typography" },
  // color: states; bg-alpha feeds the bg emission
  { name: "text", properties: ["color"], mode: "raw", family: "color", pseudo: true },
  // on the no-base allowlist: a plain element is transparent, so `--bg--hover` alone paints on hover
  {
    name: "bg",
    properties: ["background-color"],
    mode: "raw",
    family: "color",
    emit: "bg",
    pseudo: true,
    noBase: "transparent",
  },
  { name: "bg-alpha", properties: [], mode: "raw", family: "color", emit: "none" },
  // gradients: the type utility carries the prelude (direction, shape, position,
  // `in <color-space> [<hue> hue]`), --bg-stops the color stops; they compose
  // into background-image. `--bg: none` also clears background-image.
  // No tiers: a gradient rarely changes per state or breakpoint, and every tier
  // of four utilities cost 1 KB; `--bg--<tier>: none` still clears one.
  ...GRADIENT_TYPES.map(
    (type): Utility => ({
      name: `bg-${type}`,
      properties: [],
      mode: "raw",
      family: "color",
      emit: "none",
      tiers: "none",
    }),
  ),
  { name: "bg-stops", properties: [], mode: "raw", family: "color", emit: "none", tiers: "none" },
  {
    name: "border-color",
    properties: ["border-color"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-width",
    properties: ["border-width"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-style",
    properties: ["border-style"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  // border shorthands: a color, a number (px), or a length; the side rules
  // read them after the all-sides longhands, so --border-color beats --border.
  // A side takes only the shorthand (`--border-b: 1`, `--border-t: red`):
  // per-side width and color longhands were dropped as too rare for their cost
  ...BORDER_SHORTHANDS.map(
    (name): Utility => ({ name, properties: [], mode: "raw", family: "color", emit: "border" }),
  ),
  // effects: states; ring* and shadow compose into one box-shadow
  {
    name: "opacity",
    pseudo: true,
    properties: ["opacity"],
    mode: "raw",
    family: "effects",
    noBase: "1",
  },
  {
    name: "filter",
    pseudo: true,
    properties: ["filter"],
    mode: "raw",
    family: "effects",
    noBase: "none",
    // `none` empties the filter, so the composite keeps --elevation's drop-shadows
    aliases: { none: "" },
  },
  // a height: four drop-shadows in `filter` (composited on the GPU), drawn with the
  // elevation formula (generate-utilities.ts) in --shadow-angle's light and --shadow-tint
  {
    name: "elevation",
    properties: [],
    mode: "raw",
    family: "effects",
    tiers: "both",
    noBase: "0",
    emit: "none",
  },
  {
    name: "backdrop-filter",
    pseudo: true,
    properties: ["backdrop-filter"],
    mode: "raw",
    family: "effects",
    noBase: "none",
  },
  {
    name: "mix-blend",
    pseudo: true,
    properties: ["mix-blend-mode"],
    mode: "keyword",
    family: "effects",
    noBase: "normal",
  },
  {
    name: "shadow",
    properties: [],
    mode: "raw",
    family: "effects",
    emit: "none",
  },
  // the shadow color for an element and its subtree: _shadows.css re-declares the
  // --shadow-* tokens wherever this is set, so var() and primitive shadows follow
  { name: "shadow-tint", properties: [], mode: "raw", family: "box", emit: "none" },
  // the shadow's cast direction: the --shadow-* tokens rotate their offsets by it
  // (0deg casts down, clockwise), re-declared where it is set (_shadows.css)
  {
    name: "shadow-angle",
    properties: [],
    mode: "raw",
    family: "effects",
    emit: "none",
    tiers: "both",
  },
  // ring widths are signed: a number is pixels, and a negative ring is inset
  { name: "ring", properties: [], mode: "raw", family: "effects", emit: "px", tiers: "both" },
  {
    name: "ring-color",
    properties: [],
    mode: "raw",
    family: "effects",
    emit: "none",
    tiers: "both",
  },
  {
    name: "ring-offset",
    properties: [],
    mode: "raw",
    family: "effects",
    emit: "px",
    tiers: "both",
  },
  {
    name: "ring-offset-color",
    properties: [],
    mode: "raw",
    family: "effects",
    emit: "none",
    tiers: "both",
  },
  // a primitive's focus ring (and the reset's focus outline): signed like --ring,
  // the --ring-width token when unset
  {
    name: "focus-ring",
    properties: [],
    mode: "raw",
    family: "effects",
    emit: "px",
    tiers: "breakpoints",
    chainEnd: "var(--ring-width)",
  },
  {
    name: "scale",
    pseudo: true,
    properties: ["scale"],
    mode: "raw",
    family: "effects",
    noBase: "none",
  },
  {
    name: "translate",
    pseudo: true,
    properties: ["translate"],
    mode: "raw",
    family: "effects",
    noBase: "none",
  },
  {
    name: "rotate",
    pseudo: true,
    properties: ["rotate"],
    mode: "raw",
    family: "effects",
    noBase: "none",
  },
  { name: "transition", pseudo: true, properties: ["transition"], mode: "raw", family: "effects" },
  // longhands after the shorthand, so they win over --transition and over a
  // primitive's transition: retime one element without restating its property list
  {
    name: "transition-duration",
    pseudo: true,
    properties: ["transition-duration"],
    mode: "raw",
    family: "effects",
    tiers: "both",
  },
  {
    name: "transition-delay",
    pseudo: true,
    properties: ["transition-delay"],
    mode: "raw",
    family: "effects",
    tiers: "both",
  },
  // box: no tiers
  // a number is that many --spacing steps times --radius-multiplier, like the
  // --radius-* tokens (`--radius: 2.5` is --radius-md); `full` is the pill token
  {
    name: "radius",
    properties: ["border-radius"],
    mode: "dual",
    family: "box",
    tiers: "both",
    noBase: "0",
    pseudo: true,
    scale: "var(--spacing) * var(--radius-multiplier)",
    aliases: { full: "var(--radius-full)" },
  },
  // two logical corners each (Tailwind's rounded-t/-b/-l/-r), after --radius so they
  // win over it; l and r follow the writing direction
  ...(
    [
      ["radius-t", ["border-start-start-radius", "border-start-end-radius"]],
      ["radius-b", ["border-end-start-radius", "border-end-end-radius"]],
      ["radius-l", ["border-start-start-radius", "border-end-start-radius"]],
      ["radius-r", ["border-start-end-radius", "border-end-end-radius"]],
    ] as const
  ).map(
    ([name, properties]): Utility => ({
      name,
      properties,
      mode: "dual",
      family: "box",
      tiers: "breakpoints",
      noBase: "0",
      scale: "var(--spacing) * var(--radius-multiplier)",
      aliases: { full: "var(--radius-full)" },
    }),
  ),
  { name: "overflow", properties: ["overflow"], mode: "keyword", family: "box" },
  {
    name: "overflow-x",
    properties: ["overflow-x"],
    mode: "keyword",
    family: "box",
  },
  {
    name: "overflow-y",
    properties: ["overflow-y"],
    mode: "keyword",
    family: "box",
  },
  { name: "outline", pseudo: true, properties: ["outline"], mode: "raw", family: "box" },
  { name: "cursor", properties: ["cursor"], mode: "keyword", family: "box" },
  {
    name: "pointer-events",
    pseudo: true,
    properties: ["pointer-events"],
    mode: "keyword",
    family: "box",
  },
  { name: "visibility", pseudo: true, properties: ["visibility"], mode: "keyword", family: "box" },
  { name: "z", pseudo: true, properties: ["z-index"], mode: "raw", family: "box" },
  { name: "object-fit", properties: ["object-fit"], mode: "keyword", family: "box" },
  { name: "object-position", properties: ["object-position"], mode: "raw", family: "box" },
  // the divider between children for the divide-x / divide-y switches: the
  // border shorthand's grammar, emitting only its (inherited) width and color channels
  { name: "divide", properties: [], mode: "raw", family: "box", emit: "border", inherits: true },
];

/** Utilities that exist only on pseudo-elements. */
export const PSEUDO_ONLY: readonly Utility[] = [
  { name: "content", properties: ["content"], mode: "raw", family: "box", pseudo: true },
];

export const PSEUDO_SIDES = ["before", "after"] as const;
export type PseudoSide = (typeof PSEUDO_SIDES)[number];

/** Tier names a utility's family allows, in setter order. */
export function tiersOf(utility: Utility): readonly string[] {
  const kind = utility.tiers ?? FAMILY_TIERS[utility.family];
  if (kind === "breakpoints") return BREAKPOINTS;
  if (kind === "states") return STATES;
  if (kind === "both") return [...STATES, ...BREAKPOINTS];
  return [];
}

/** A utility property name, split into its parts. */
export interface UtilityName {
  name: string;
  tier?: string;
  side?: string;
  group?: true;
}

const TIER_NAMES = new Set<string>([...BREAKPOINTS, ...STATES]);

/** `--before-w--md` → { side: "before", name: "w", tier: "md" }; `--group-bg--hover` sets `group`. */
export function parseUtilityName(raw: string): UtilityName {
  let body = raw.slice(2);
  let group: true | undefined;
  if (body.startsWith("group-")) {
    group = true;
    body = body.slice("group-".length);
  }
  let side: string | undefined;
  for (const candidate of PSEUDO_SIDES) {
    if (body.startsWith(`${candidate}-`)) {
      side = candidate;
      body = body.slice(candidate.length + 1);
      break;
    }
  }
  const split = body.lastIndexOf("--");
  if (split > 0 && TIER_NAMES.has(body.slice(split + 2))) {
    return {
      name: body.slice(0, split),
      tier: body.slice(split + 2),
      side,
      ...(group ? { group } : {}),
    };
  }
  return { name: body, side, ...(group ? { group } : {}) };
}
