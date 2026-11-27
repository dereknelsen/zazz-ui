"use strict";

/**
 * @fileoverview The `small-sizes` codemod's pure parts.
 * @description The kit removed the small control sizes: `data-button-size` and
 * `data-toggle-size` lost `"sm"` and `"icon-sm"`. A project either drops them
 * from its markup (`removeSmallSizes`: `"sm"` goes, `"icon-sm"` becomes
 * `"icon"`) or keeps them with the rules the kit removed (`smallSizesCss`),
 * which the command appends to the vendored stylesheets or writes to a
 * stylesheet of the project's own. Fields never had a small size and are not
 * touched. Pure text in, text out; the command (`commands/codemod.ts`) owns
 * the files.
 */

export type SizedPrimitive = "button" | "toggle";

export interface SizeReview {
  /** 1-based line in the rewritten source. */
  line: number;
  text: string;
}

export interface SizeResult {
  output: string;
  /** Attributes rewritten. */
  count: number;
  /** Places that still set a small size and need a hand. */
  review: SizeReview[];
}

/**
 * A written-out attribute with exactly `sm` or `icon-sm`: in plain, single, or
 * backslash-escaped quotes or unquoted, with or without spaces around `=`, in
 * any case. The leading whitespace is captured so a removed attribute takes its
 * separator (or its own line) with it. `:data-…` and `x-data-…` are not
 * matched: they are bindings, not values.
 */
const ATTRIBUTE =
  /(\s+)(data-(?:button|toggle)-size)\s*=\s*(?:(\\?["'])(sm|icon-sm)\3|(sm|icon-sm)(?=[\s/>]))/gi;

const SMALL = String.raw`(?:icon-sm|sm)`;
const QUOTED_SMALL = String.raw`["'\x60]${SMALL}["'\x60]`;
/** Places that still set a small size after the rewrite, each matched per line. */
const LEFTOVERS: RegExp[] = [
  // an attribute selector, any operator
  new RegExp(String.raw`\[data-(?:button|toggle)-size\s*[~|^$*]?=[^\]\n]{0,40}?\b${SMALL}\b`, "gi"),
  // script: dataset, setAttribute, and a quoted name in an object literal
  new RegExp(String.raw`\bdataset\.(?:button|toggle)Size\b[^\n]{0,80}?${QUOTED_SMALL}`, "g"),
  new RegExp(
    String.raw`["'\x60]data-(?:button|toggle)-size["'\x60]\s*[,:][^\n]{0,80}?${QUOTED_SMALL}`,
    "gi",
  ),
  // a template expression, or a quoted value that is more than the bare size
  new RegExp(
    String.raw`[:@]?data-(?:button|toggle)-size\s*=\s*\{[^\n]{0,200}?${QUOTED_SMALL}`,
    "gi",
  ),
  new RegExp(
    String.raw`[:@]?data-(?:button|toggle)-size\s*=\s*(\\?["'])(?:(?!\1)[^\n]){0,200}?\b${SMALL}\b(?:(?!\1)[^\n]){0,200}?\1`,
    "gi",
  ),
];

/** Drops `"sm"` and turns `"icon-sm"` into `"icon"` on buttons and toggles; lists what it can't rewrite. */
export function removeSmallSizes(source: string): SizeResult {
  let count = 0;
  const output = source.replace(
    ATTRIBUTE,
    (
      _match,
      space: string,
      name: string,
      quote: string | undefined,
      quoted: string | undefined,
      bare: string | undefined,
    ) => {
      count++;
      const size = (quoted ?? bare)!.toLowerCase();
      const q = quote ?? '"';
      return size === "sm" ? "" : `${space}${name}=${q}icon${q}`;
    },
  );
  const seen = new Set<number>();
  const review: SizeReview[] = [];
  for (const pattern of LEFTOVERS) {
    for (const match of output.matchAll(pattern)) {
      const line = output.slice(0, match.index).split("\n").length;
      if (seen.has(line)) continue;
      seen.add(line);
      review.push({ line, text: output.split("\n")[line - 1]!.trim() });
    }
  }
  review.sort((a, b) => a.line - b.line);
  return { output, count, review };
}

const MARKER = "Added by `zazz-ui codemod small-sizes`";

/**
 * True when a stylesheet already has the rules this codemod adds, so they are
 * not added twice. It looks for the codemod's own header, not the selectors: a
 * vendored kit from before the removal still ships its own copy, which the
 * next `update` deletes, so that copy must not count.
 */
export function hasRestoredSmallSizes(css: string, primitive?: SizedPrimitive): boolean {
  return primitive ? css.includes(`${MARKER}: the small ${primitive} sizes`) : css.includes(MARKER);
}

const HEADER = (primitive: SizedPrimitive) =>
  `/* ${MARKER}: the small ${primitive} sizes the kit removed
   (data-${primitive}-size="sm" and "icon-sm"), kept for this project. */`;

const BUTTON_RULES = String.raw`  :where([data-ui~="button"][data-button-size="sm"]) {
    --_button-min-h: calc(var(--spacing) * 6);
    /* a 16px icon, this, and the border fit the 24px box */
    --_button-py: calc(var(--spacing) * 0.75);
    --_button-px: calc(var(--spacing) * 2);
    --_button-radius: var(--radius-sm);
    --_button-font-size: var(--font-size-xs);
    /* dense by choice: the box stays small and ::after takes the touch floor */
    --_touch-floor: 0px;
    position: relative;
  }

  :where(
    :is(ui-button-group, [data-ui~="button-group"]):has([data-ui~="button"][data-button-size="sm"])
  ) {
    --ui-button-group-radius: var(--radius-sm);
  }

  :where([data-ui~="button"][data-button-size="icon-sm"]) {
    --_button-min-h: calc(var(--spacing) * 6);
    --_button-px: calc(var(--spacing) * 2);
    --_button-radius: var(--radius-sm);
    /* the hook, not a private: it must inherit to reach the icon */
    --ui-button-icon-size: calc(var(--spacing) * 3.5);
    --_touch-floor: 0px;
    position: relative;

    block-size: calc(var(--_min-h-len) + var(--_min-h-num) * var(--spacing));
    inline-size: calc(var(--_min-h-len) + var(--_min-h-num) * var(--spacing));
    padding: 0;
    aspect-ratio: 1 / 1;
  }

  /* touch: sm and icon-sm keep their box; a transparent ::after centred on the button
     is at least --_touch-min square (it collapses to the box on a mouse) */
  :where([data-ui~="button"]:is([data-button-size="sm"], [data-button-size="icon-sm"]))::after {
    content: "";
    position: absolute;
    inset: min(0px, calc((100% - var(--_touch-min)) / 2));
  }

  :where([data-ui~="button"][data-button-size="sm"]):has(
    > :where(kbd, ui-kbd-group, [data-ui~="kbd-group"]):last-child:not(:only-child)
  ) {
    padding-inline-end: calc(var(--spacing) * 0.5 + var(--_touch-px));
  }

  :where([data-ui~="button"][data-button-size="sm"]):has(
    > :where(kbd, ui-kbd-group, [data-ui~="kbd-group"]):first-child:not(:only-child)
  ) {
    padding-inline-start: calc(var(--spacing) * 0.5 + var(--_touch-px));
  }`;

const TOGGLE_RULES = String.raw`  :where([data-ui~="toggle"][data-toggle-size="sm"]) {
    --_toggle-min-h: calc(var(--spacing) * 6);
    /* a 16px icon, this, and the border fit the 24px box */
    --_toggle-py: calc(var(--spacing) * 0.75);
    --_toggle-px: calc(var(--spacing) * 2);
    --_toggle-radius: var(--radius-sm);
    --_toggle-font-size: var(--font-size-xs);
    /* dense by choice: the box stays small and ::after takes the touch floor */
    --_touch-floor: 0px;
  }

  :where([data-ui~="toggle"][data-toggle-size="icon-sm"]) {
    --_toggle-min-h: calc(var(--spacing) * 6);
    --_toggle-px: calc(var(--spacing) * 2);
    --_toggle-radius: var(--radius-sm);
    /* the hook, not a private: it must inherit to reach the icon */
    --ui-toggle-icon-size: calc(var(--spacing) * 3.5);
    --_touch-floor: 0px;

    block-size: calc(var(--_min-h-len) + var(--_min-h-num) * var(--spacing));
    inline-size: calc(var(--_min-h-len) + var(--_min-h-num) * var(--spacing));
    padding: 0;
    aspect-ratio: 1 / 1;
  }

  /* touch: sm and icon-sm keep their box; a transparent ::after centred on the toggle
     (already position: relative) is at least --_touch-min square */
  :where([data-ui~="toggle"]:is([data-toggle-size="sm"], [data-toggle-size="icon-sm"]))::after {
    content: "";
    position: absolute;
    inset: min(0px, calc((100% - var(--_touch-min)) / 2));
  }

  :where([data-ui~="toggle"][data-toggle-size="sm"]):has(
    > :where(kbd, ui-kbd-group, [data-ui~="kbd-group"]):nth-last-child(1 of :not(input)):not(
        :nth-child(1 of :not(input))
      )
  ) {
    padding-inline-end: calc(var(--spacing) * 0.5 + var(--_touch-px));
  }

  :where([data-ui~="toggle"][data-toggle-size="sm"]):has(
    > :where(kbd, ui-kbd-group, [data-ui~="kbd-group"]):nth-child(1 of :not(input)):not(
        :nth-last-child(1 of :not(input))
      )
  ) {
    padding-inline-start: calc(var(--spacing) * 0.5 + var(--_touch-px));
  }`;

/** The removed rules for one primitive, in the layer the kit's own presets use. */
export function smallSizesCss(primitive: SizedPrimitive): string {
  const rules = primitive === "button" ? BUTTON_RULES : TOGGLE_RULES;
  return `${HEADER(primitive)}\n@layer ui.components {\n${rules}\n}\n`;
}
