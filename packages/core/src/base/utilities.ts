"use strict";

/**
 * @fileoverview The utility table: the single source the utilities generator,
 * the editor custom data, and `<ui-debug>` read. Data only — no imports, no
 * CSS text.
 */

/** Breakpoints, ascending. */
export const BREAKPOINTS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/** Inline-size threshold at or above which a breakpoint tier applies. */
export const BREAKPOINT_REM: Record<Breakpoint, number> = {
  "2xs": 24,
  xs: 30,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  "2xl": 96,
};

/** Interaction states, highest precedence first. */
export const STATES = [
  "disabled",
  "active",
  "focus-visible",
  "focus-within",
  "hover",
  "checked",
  "open",
] as const;
export type State = (typeof STATES)[number];

/** The pseudo-class (or `:is()` list) that selects each state, and the media guard if any. */
export const STATE_SELECTORS: Record<State, { pseudo: string; media?: string }> = {
  disabled: { pseudo: ':is(:disabled, [aria-disabled="true"])' },
  active: { pseudo: ":active" },
  "focus-visible": { pseudo: ":focus-visible" },
  "focus-within": { pseudo: ":focus-within" },
  hover: { pseudo: ":hover", media: "(hover: hover)" },
  checked: { pseudo: ':is(:checked, [aria-checked="true"])' },
  open: { pseudo: ':is([open], :popover-open, [aria-expanded="true"])' },
};

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

export type Tiers = "breakpoints" | "states" | "none";

export const FAMILY_TIERS: Record<Family, Tiers> = {
  flow: "breakpoints",
  grid: "breakpoints",
  spacing: "breakpoints",
  margin: "breakpoints",
  sizing: "breakpoints",
  typography: "breakpoints",
  color: "states",
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
   * `repeat(n, minmax(0, 1fr))`; `grid-fit` packs auto-fit columns;
   * `line-clamp` adds the -webkit-box companions; `bg` is a relative oklch
   * with `--bg-alpha`; `none` feeds a composite (`box-shadow`) and emits nothing itself;
   * `border` is a border shorthand: it sorts a color, number, or length into
   * width and color channels, and the side rules emit them.
   */
  emit?: "plain" | "repeat" | "grid-fit" | "line-clamp" | "bg" | "none" | "border";
  /**
   * No-base allowlist: the CSS initial value as a literal. A utility with
   * `noBase` applies a tier on a plain element without a base value.
   */
  noBase?: string;
  /**
   * Extra selectors excluded from the no-base rule: elements whose
   * placement chain a primitive owns, e.g. a layout's children for `--col`.
   */
  noBaseExclude?: readonly string[];
  /**
   * Keywords the typed dual pair cannot carry. An element whose style
   * holds any keyword form of any utility in the family switches that family to
   * the raw emission (numbers then no longer work there).
   */
  keywords?: readonly string[];
  /**
   * The utility also exists as `--before-<name>` / `--after-<name>`,
   * read on the pseudo-element with an exact gate. Pseudo utilities are never
   * registered, because `::before` must inherit them from its host.
   */
  pseudo?: true;
}

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

/** The utility table. Order within a family is emission order (shorthands first). */
export const UTILITIES: readonly Utility[] = [
  // flow: keywords and raw values; most are on the no-base allowlist
  { name: "display", properties: ["display"], mode: "keyword", family: "flow" },
  {
    name: "flex-direction",
    properties: ["flex-direction"],
    mode: "keyword",
    family: "flow",
    noBase: "row",
  },
  {
    name: "flex-wrap",
    properties: ["flex-wrap"],
    mode: "keyword",
    family: "flow",
    noBase: "nowrap",
  },
  { name: "shrink", properties: ["flex-shrink"], mode: "raw", family: "flow", noBase: "1" },
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
  { name: "place", properties: ["place-items"], mode: "keyword", family: "flow", noBase: "normal" },
  { name: "self", properties: ["align-self"], mode: "keyword", family: "flow", noBase: "auto" },
  { name: "flex", properties: ["flex"], mode: "raw", family: "flow", noBase: "0 1 auto" },
  { name: "basis", properties: ["flex-basis"], mode: "raw", family: "flow", noBase: "auto" },
  { name: "order", properties: ["order"], mode: "raw", family: "flow", noBase: "0" },
  {
    name: "col",
    properties: ["grid-column"],
    mode: "raw",
    family: "flow",
    noBase: "auto",
    // a layout places its children; a tier-only --col keeps the band
    noBaseExclude: ["ui-layout > *", '[data-ui~="layout"] > *'],
  },
  { name: "row", properties: ["grid-row"], mode: "raw", family: "flow", noBase: "auto" },
  // grid: integers become repeat(); templates are raw; grid-fit packs auto-fit columns
  {
    name: "grid-cols",
    properties: ["grid-template-columns"],
    mode: "integer",
    family: "grid",
    emit: "repeat",
    noBase: "1",
  },
  {
    name: "grid-rows",
    properties: ["grid-template-rows"],
    mode: "integer",
    family: "grid",
    emit: "repeat",
    noBase: "1",
  },
  {
    name: "grid-template-cols",
    properties: ["grid-template-columns"],
    mode: "raw",
    family: "grid",
  },
  { name: "grid-template-rows", properties: ["grid-template-rows"], mode: "raw", family: "grid" },
  {
    name: "grid-fit",
    properties: ["grid-template-columns"],
    mode: "raw",
    family: "grid",
    emit: "grid-fit",
  },
  // spacing: dual mode; gap is on the no-base allowlist
  { name: "p", properties: ["padding"], mode: "dual", family: "spacing" },
  { name: "px", properties: ["padding-inline"], mode: "dual", family: "spacing" },
  { name: "py", properties: ["padding-block"], mode: "dual", family: "spacing" },
  { name: "pt", properties: ["padding-block-start"], mode: "dual", family: "spacing" },
  { name: "pb", properties: ["padding-block-end"], mode: "dual", family: "spacing" },
  { name: "pl", properties: ["padding-inline-start"], mode: "dual", family: "spacing" },
  { name: "pr", properties: ["padding-inline-end"], mode: "dual", family: "spacing" },
  { name: "gap", properties: ["gap"], mode: "dual", family: "spacing", noBase: "0" },
  { name: "gap-x", properties: ["column-gap"], mode: "dual", family: "spacing", noBase: "0" },
  { name: "gap-y", properties: ["row-gap"], mode: "dual", family: "spacing", noBase: "0" },
  { name: "inset", properties: ["inset"], mode: "dual", family: "spacing" },
  { name: "top", properties: ["inset-block-start"], mode: "dual", family: "spacing" },
  { name: "bottom", properties: ["inset-block-end"], mode: "dual", family: "spacing" },
  { name: "left", properties: ["inset-inline-start"], mode: "dual", family: "spacing" },
  { name: "right", properties: ["inset-inline-end"], mode: "dual", family: "spacing" },
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
  // sizing: dual mode plus the four keywords
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
    keywords: SIZING_KEYWORDS,
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
    keywords: SIZING_KEYWORDS,
    pseudo: true,
  },
  {
    name: "max-h",
    properties: ["max-block-size"],
    mode: "dual",
    family: "sizing",
    keywords: SIZING_KEYWORDS,
    pseudo: true,
  },
  { name: "aspect", properties: ["aspect-ratio"], mode: "raw", family: "sizing", noBase: "auto" },
  // typography: one utility per property; roles live in _typography.css
  { name: "font-size", properties: ["font-size"], mode: "raw", family: "typography" },
  { name: "font-weight", properties: ["font-weight"], mode: "raw", family: "typography" },
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
  {
    name: "text-decoration",
    properties: ["text-decoration-line"],
    mode: "raw",
    family: "typography",
  },
  { name: "whitespace", properties: ["white-space"], mode: "keyword", family: "typography" },
  // color: states; bg-alpha feeds the bg emission
  { name: "text", properties: ["color"], mode: "raw", family: "color", pseudo: true },
  {
    name: "bg",
    properties: ["background-color"],
    mode: "raw",
    family: "color",
    emit: "bg",
    pseudo: true,
  },
  { name: "bg-alpha", properties: [], mode: "raw", family: "color", emit: "none" },
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
  {
    name: "border-t-width",
    properties: ["border-block-start-width"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-t-color",
    properties: ["border-block-start-color"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-b-width",
    properties: ["border-block-end-width"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-b-color",
    properties: ["border-block-end-color"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-l-width",
    properties: ["border-inline-start-width"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-l-color",
    properties: ["border-inline-start-color"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-r-width",
    properties: ["border-inline-end-width"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  {
    name: "border-r-color",
    properties: ["border-inline-end-color"],
    mode: "raw",
    family: "color",
    pseudo: true,
  },
  // border shorthands: a color, a number (px), or a length; the side
  // rules read them after the longhands, so --border-color beats --border
  ...BORDER_SHORTHANDS.map(
    (name): Utility => ({ name, properties: [], mode: "raw", family: "color", emit: "border" }),
  ),
  // effects: states; ring* and shadow compose into one box-shadow
  { name: "opacity", properties: ["opacity"], mode: "raw", family: "effects", noBase: "1" },
  { name: "shadow", properties: [], mode: "raw", family: "effects", emit: "none" },
  { name: "ring", properties: [], mode: "raw", family: "effects", emit: "none" },
  { name: "ring-color", properties: [], mode: "raw", family: "effects", emit: "none" },
  { name: "ring-offset", properties: [], mode: "raw", family: "effects", emit: "none" },
  { name: "ring-offset-color", properties: [], mode: "raw", family: "effects", emit: "none" },
  { name: "scale", properties: ["scale"], mode: "raw", family: "effects", noBase: "none" },
  { name: "translate", properties: ["translate"], mode: "raw", family: "effects", noBase: "none" },
  { name: "rotate", properties: ["rotate"], mode: "raw", family: "effects", noBase: "none" },
  { name: "transition", properties: ["transition"], mode: "raw", family: "effects" },
  // box: no tiers
  {
    name: "rounded",
    properties: ["border-radius"],
    mode: "raw",
    family: "box",
    pseudo: true,
    noBase: "0",
  },
  { name: "overflow", properties: ["overflow"], mode: "keyword", family: "box", noBase: "visible" },
  {
    name: "overflow-x",
    properties: ["overflow-x"],
    mode: "keyword",
    family: "box",
    noBase: "visible",
  },
  {
    name: "overflow-y",
    properties: ["overflow-y"],
    mode: "keyword",
    family: "box",
    noBase: "visible",
  },
  { name: "outline", properties: ["outline"], mode: "raw", family: "box" },
  { name: "cursor", properties: ["cursor"], mode: "keyword", family: "box" },
  { name: "isolation", properties: ["isolation"], mode: "keyword", family: "box" },
  { name: "pointer-events", properties: ["pointer-events"], mode: "keyword", family: "box" },
  { name: "visibility", properties: ["visibility"], mode: "keyword", family: "box" },
  { name: "z", properties: ["z-index"], mode: "raw", family: "box", noBase: "auto" },
  { name: "position", properties: ["position"], mode: "keyword", family: "box", noBase: "static" },
  { name: "object-fit", properties: ["object-fit"], mode: "keyword", family: "box" },
];

/** Utilities that exist only on pseudo-elements. */
export const PSEUDO_ONLY: readonly Utility[] = [
  { name: "content", properties: ["content"], mode: "raw", family: "box", pseudo: true },
];

export const PSEUDO_SIDES = ["before", "after"] as const;
export type PseudoSide = (typeof PSEUDO_SIDES)[number];

/** Tier names a utility's family allows, in setter order. */
export function tiersOf(utility: Utility): readonly string[] {
  const kind = FAMILY_TIERS[utility.family];
  if (kind === "breakpoints") return BREAKPOINTS;
  if (kind === "states") return STATES;
  return [];
}
