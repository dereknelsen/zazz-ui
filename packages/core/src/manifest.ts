"use strict";

/**
 * @fileoverview The kit's distribution manifest: machine-readable facts about
 * every primitive — its files, its dependencies on other primitives and base
 * scripts, its bare npm imports, and its example fragments — plus the
 * distribution map (`DIST_CSS`): which `src/` stylesheets each `dist/` css
 * file bundles.
 * @description This is the single data source for anything that assembles a
 * subset of the kit: the `zazz-ui` CLI (`add` resolves the dependency closure
 * from `PRIMITIVES`), the docs site (install blocks and previews), the head
 * builder's granular CDN mode, and `scripts/build-dist.mjs` (which emits
 * exactly the files `DIST_CSS` lists, so the CLI and docs can map a
 * primitive to its `dist/` file without reading the build script).
 * Presentation metadata for the docs previews (iframe heights, placement) is
 * docs-site state and lives in the docs app
 * (`apps/docs/lib/preview-manifest.ts`), not in the published kit.
 *
 * Paths are tarball-relative to the package `src/` root (`DIST_CSS` keys are
 * relative to `dist/`). Script fields list the emitted `.js` files (the
 * published, browser-runnable form); consumers that want `.ts` sources or
 * `.d.ts` types swap the extension. `manifest.test.ts` guards this file
 * against drift: every primitive directory must have an entry, every listed
 * file must exist, every bare specifier must be pinned in `head.ts`'s import
 * map, and the primitives with css and the `dist/primitives/<name>.css`
 * entries are the same set. `dist.test.ts` checks a built `dist/` against
 * `DIST_CSS`.
 */

// --- Manifest version ---

/**
 * Compatibility version of this manifest's shape. Consumers (the CLI) declare
 * the range they understand and fail gracefully on a newer value. Bumping it
 * is by definition a breaking kit change (ADR-0010).
 */
export const MANIFEST_VERSION = 1;

// --- Primitive entries ---

/** One primitive's distribution facts. All paths are `src/`-relative. */
export interface PrimitiveEntry {
  /** Stylesheets owned by the primitive (usually one; empty = markup-only). */
  css: string[];
  /** Scripts owned by the primitive, in load order. */
  js: string[];
  /**
   * Non-core `base/` scripts its behavior needs, in load order. The core
   * runtime (`utils`, `signals`, `zazz-element`, `dialog-lifecycle`) is
   * assumed present (vendored by `init`, bundled in `dist/zazz.js`) and is
   * never listed here.
   */
  base: string[];
  /** Other primitives whose css/markup contract this primitive requires. */
  primitives: string[];
  /**
   * Bare npm specifiers reachable from this primitive's script chain (its own
   * `js` plus `base` plus the core runtime they import). Every value must have
   * an import-map pin in `head.ts`; a page loading this primitive's scripts
   * granularly needs these mapped.
   */
  bare: string[];
  /** Example fragments (`--examples`, docs previews). */
  examples: string[];
}

/** Bare specifiers pulled in by `base/signals.ts` (core runtime). */
const SIGNALS_BARE = ["signal-polyfill"];

/** Bare specifiers pulled in by `base/embla.ts`. */
const EMBLA_BARE = [
  "embla-carousel",
  "embla-carousel-autoplay",
  "embla-carousel-auto-scroll",
  "embla-carousel-class-names",
];

/** The typeahead engine stack shared by autocomplete, combobox, and command. */
const TYPEAHEAD_BASE = ["base/command-score.js", "base/hotkeys.js", "base/typeahead.js"];

/**
 * Every primitive in the kit, keyed by directory name under `src/primitives/`.
 * `primitives` dependencies mirror each stylesheet's `@requires` header (the
 * authoritative record of cross-primitive contracts); markup-only primitives
 * list the primitives their canonical example composes.
 */
export const PRIMITIVES: Record<string, PrimitiveEntry> = {
  accordion: {
    css: ["primitives/accordion/accordion.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/accordion/accordion.html"],
  },
  "alert-dialog": {
    css: ["primitives/alert-dialog/alert-dialog.css"],
    js: [],
    base: [],
    primitives: ["dialog"],
    bare: [],
    examples: ["primitives/alert-dialog/alert-dialog.html"],
  },
  autocomplete: {
    css: ["primitives/autocomplete/autocomplete.css"],
    js: ["primitives/autocomplete/autocomplete.js"],
    base: TYPEAHEAD_BASE,
    primitives: ["popover", "button", "fields", "select", "input"],
    bare: SIGNALS_BARE,
    examples: [
      "primitives/autocomplete/autocomplete.html",
      "primitives/autocomplete/autocomplete-groups.html",
    ],
  },
  avatar: {
    css: [],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/avatar/avatar.html"],
  },
  badge: {
    css: ["primitives/badge/badge.css"],
    js: [],
    base: [],
    primitives: ["fields"],
    bare: [],
    examples: ["primitives/badge/badge.html", "primitives/badge/badge-icon.html"],
  },
  breadcrumbs: {
    css: [],
    js: [],
    base: [],
    primitives: ["button"],
    bare: [],
    examples: ["primitives/breadcrumbs/breadcrumbs.html"],
  },
  button: {
    css: ["primitives/button/button.css"],
    js: [],
    base: [],
    primitives: ["kbd", "fields"],
    bare: [],
    examples: [
      "primitives/button/button.html",
      "primitives/button/button-icon.html",
      "primitives/button/button-icon-only.html",
    ],
  },
  "button-group": {
    css: ["primitives/button-group/button-group.css"],
    js: [],
    base: [],
    primitives: ["button"],
    bare: [],
    examples: [
      "primitives/button-group/button-group.html",
      "primitives/button-group/button-group-vertical.html",
    ],
  },
  card: {
    css: [],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/card/card.html", "primitives/card/card-subgrid.html"],
  },
  carousel: {
    css: ["primitives/carousel/carousel.css"],
    js: ["primitives/carousel/carousel.js"],
    base: ["base/embla.js"],
    primitives: [],
    bare: EMBLA_BARE,
    examples: ["primitives/carousel/carousel.html"],
  },
  checkbox: {
    css: ["primitives/checkbox/checkbox.css"],
    js: ["primitives/checkbox/checkbox.js"],
    base: [],
    primitives: ["fields"],
    bare: SIGNALS_BARE,
    examples: ["primitives/checkbox/checkbox.html", "primitives/checkbox/checkbox-tasklist.html"],
  },
  combobox: {
    css: ["primitives/combobox/combobox.css"],
    js: ["primitives/combobox/combobox.js"],
    base: TYPEAHEAD_BASE,
    primitives: ["popover", "button", "fields", "badge", "select"],
    bare: SIGNALS_BARE,
    examples: [
      "primitives/combobox/combobox.html",
      "primitives/combobox/combobox-multiselect.html",
    ],
  },
  command: {
    css: ["primitives/command/command.css"],
    js: ["primitives/command/command.js", "primitives/command/command-actions.js"],
    base: TYPEAHEAD_BASE,
    primitives: ["popover", "button", "fields", "dialog", "menu", "select", "kbd"],
    bare: SIGNALS_BARE,
    examples: [
      "primitives/command/command.html",
      "primitives/command/command-dialog.html",
      "primitives/command/command-actions.html",
    ],
  },
  dialog: {
    css: ["primitives/dialog/dialog.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/dialog/dialog.html", "primitives/dialog/dialog-with-form.html"],
  },
  fields: {
    css: ["primitives/fields/fields.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: [],
  },
  input: {
    css: ["primitives/input/input.css"],
    js: [],
    base: [],
    primitives: ["fields"],
    bare: [],
    examples: [
      "primitives/input/input.html",
      "primitives/input/input-icon-leading.html",
      "primitives/input/input-icon-trailing.html",
    ],
  },
  "input-group": {
    css: ["primitives/input-group/input-group.css"],
    js: [],
    base: [],
    primitives: ["fields", "input", "textarea", "button"],
    bare: [],
    examples: [
      "primitives/input-group/input-group.html",
      "primitives/input-group/input-group-password-group.html",
    ],
  },
  kbd: {
    css: ["primitives/kbd/kbd.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/kbd/kbd.html", "primitives/kbd/kbd-group.html"],
  },
  lightbox: {
    css: ["primitives/lightbox/lightbox.css"],
    js: ["primitives/lightbox/lightbox.js"],
    base: ["base/embla.js"],
    primitives: ["dialog", "carousel", "button"],
    bare: EMBLA_BARE,
    examples: ["primitives/lightbox/lightbox.html"],
  },
  menu: {
    css: ["primitives/menu/menu.css"],
    js: ["primitives/menu/menu.js"],
    base: [],
    primitives: ["popover", "button"],
    bare: [],
    examples: ["primitives/menu/menu.html", "primitives/menu/menu-interest.html"],
  },
  menubar: {
    css: [],
    js: [],
    base: [],
    primitives: ["menu", "button", "separator"],
    bare: [],
    examples: ["primitives/menubar/menubar.html", "primitives/menubar/menubar-help-search.html"],
  },
  meter: {
    css: ["primitives/meter/meter.css"],
    js: [],
    base: [],
    primitives: ["progress"],
    bare: [],
    examples: ["primitives/meter/meter.html"],
  },
  "mobile-menu": {
    css: ["primitives/mobile-menu/mobile-menu.css"],
    js: [],
    base: [],
    primitives: ["dialog", "accordion"],
    bare: [],
    examples: ["primitives/mobile-menu/mobile-menu.html"],
  },
  "navigation-menu": {
    css: ["primitives/navigation-menu/navigation-menu.css"],
    js: [],
    base: [],
    primitives: ["popover", "button"],
    bare: [],
    examples: [
      "primitives/navigation-menu/navigation-menu.html",
      "primitives/navigation-menu/navigation-menu-simple.html",
      "primitives/navigation-menu/navigation-menu-interest.html",
      "primitives/navigation-menu/navigation-menu-featured.html",
      "primitives/navigation-menu/navigation-menu-icon-grid.html",
      "primitives/navigation-menu/navigation-menu-megamenu.html",
    ],
  },
  otp: {
    css: ["primitives/otp/otp.css"],
    js: ["primitives/otp/otp.js"],
    base: [],
    primitives: ["fields", "input"],
    bare: SIGNALS_BARE,
    examples: ["primitives/otp/otp.html"],
  },
  "password-group": {
    css: ["primitives/password-group/password-group.css"],
    js: ["primitives/password-group/password-group.js"],
    base: [],
    primitives: ["fields", "input", "button"],
    bare: SIGNALS_BARE,
    examples: ["primitives/password-group/password-group.html"],
  },
  popover: {
    css: ["primitives/popover/popover.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: [],
  },
  progress: {
    css: ["primitives/progress/progress.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: [
      "primitives/progress/progress.html",
      "primitives/progress/progress-indeterminate.html",
    ],
  },
  prose: {
    css: [],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/prose/prose.html"],
  },
  radio: {
    css: ["primitives/radio/radio.css"],
    js: [],
    base: [],
    primitives: ["fields"],
    bare: [],
    examples: ["primitives/radio/radio.html"],
  },
  reveal: {
    css: ["primitives/reveal/reveal.css"],
    js: [],
    base: ["base/reveal.js"],
    primitives: [],
    bare: [],
    examples: [],
  },
  select: {
    css: ["primitives/select/select.css"],
    js: ["primitives/select/multiselect.js"],
    base: [],
    primitives: ["fields", "popover", "button"],
    bare: SIGNALS_BARE,
    examples: [
      "primitives/select/select.html",
      "primitives/select/select-align.html",
      "primitives/select/select-sides.html",
      "primitives/select/select-multiple.html",
    ],
  },
  separator: {
    css: ["primitives/separator/separator.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/separator/separator.html"],
  },
  slider: {
    css: ["primitives/slider/slider.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/slider/slider.html"],
  },
  switch: {
    css: ["primitives/switch/switch.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/switch/switch.html"],
  },
  table: {
    css: ["primitives/table/table.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: [
      "primitives/table/table.html",
      "primitives/table/table-grid.html",
      "primitives/table/table-alternating.html",
      "primitives/table/table-size-sm.html",
    ],
  },
  tabs: {
    css: ["primitives/tabs/tabs.css"],
    js: ["primitives/tabs/tabs.js"],
    base: [],
    primitives: ["fields"],
    bare: [],
    examples: ["primitives/tabs/tabs.html"],
  },
  textarea: {
    css: ["primitives/textarea/textarea.css"],
    js: [],
    base: [],
    primitives: ["fields"],
    bare: [],
    examples: ["primitives/textarea/textarea.html"],
  },
  toaster: {
    css: ["primitives/toaster/toaster.css"],
    js: ["primitives/toaster/toaster.js"],
    base: [],
    primitives: ["popover", "button"],
    bare: SIGNALS_BARE,
    examples: ["primitives/toaster/toaster.html"],
  },
  toggle: {
    css: ["primitives/toggle/toggle.css"],
    js: [],
    base: [],
    primitives: ["button"],
    bare: [],
    examples: ["primitives/toggle/toggle.html"],
  },
  "toggle-group": {
    css: ["primitives/toggle-group/toggle-group.css"],
    js: [],
    base: [],
    primitives: ["toggle"],
    bare: [],
    examples: [
      "primitives/toggle-group/toggle-group.html",
      "primitives/toggle-group/toggle-group-multiple.html",
      "primitives/toggle-group/toggle-group-vertical.html",
    ],
  },
  toolbar: {
    css: [],
    js: [],
    base: [],
    primitives: [
      "button",
      "button-group",
      "input",
      "select",
      "separator",
      "toggle",
      "toggle-group",
    ],
    bare: [],
    examples: ["primitives/toolbar/toolbar.html"],
  },
  tooltip: {
    css: ["primitives/tooltip/tooltip.css"],
    js: [],
    base: [],
    primitives: ["popover", "kbd"],
    bare: [],
    examples: [
      "primitives/tooltip/tooltip.html",
      "primitives/tooltip/tooltip-with-kbd.html",
      "primitives/tooltip/tooltip-sides.html",
      "primitives/tooltip/tooltip-disabled.html",
    ],
  },
  utilities: {
    css: [],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: [
      "primitives/utilities/aspect-ratio.html",
      "primitives/utilities/basis.html",
      "primitives/utilities/col-span.html",
      "primitives/utilities/compose.html",
      "primitives/utilities/flex-align.html",
      "primitives/utilities/flex-direction.html",
      "primitives/utilities/flex-grow.html",
      "primitives/utilities/gap.html",
      "primitives/utilities/grid-cols.html",
      "primitives/utilities/grid-pile.html",
      "primitives/utilities/grid-responsive.html",
      "primitives/utilities/margin-auto.html",
      "primitives/utilities/object-fit.html",
      "primitives/utilities/order.html",
      "primitives/utilities/overflow.html",
      "primitives/utilities/padding-compose.html",
      "primitives/utilities/padding.html",
      "primitives/utilities/position.html",
      "primitives/utilities/responsive-flex.html",
      "primitives/utilities/responsive-grid.html",
      "primitives/utilities/size.html",
      "primitives/utilities/width.html",
    ],
  },
};

// --- Canonical cascade order ---

/**
 * Primitive names in the exact `@import` order of `src/index.css`. Anything
 * assembling a stylesheet subset (the CLI's `add`, the granular CDN head)
 * must emit primitive css in this order so component scopes cascade the way
 * the kit was designed and tested. Markup-only primitives (no css) do not
 * appear. `manifest.test.ts` asserts this list matches `index.css` exactly.
 */
export const CSS_CASCADE_ORDER: string[] = [
  "separator",
  "fields",
  "badge",
  "kbd",
  "button",
  "button-group",
  "toggle",
  "toggle-group",
  "accordion",
  "table",
  "progress",
  "meter",
  "popover",
  "tooltip",
  "dialog",
  "alert-dialog",
  "menu",
  "navigation-menu",
  "mobile-menu",
  "input",
  "textarea",
  "select",
  "autocomplete",
  "combobox",
  "command",
  "checkbox",
  "slider",
  "switch",
  "input-group",
  "password-group",
  "otp",
  "radio",
  "tabs",
  "carousel",
  "lightbox",
  "toaster",
  "reveal",
];

// --- Distribution css map ---

/** The `dist/` file holding only the cascade-layer order (`base/_layers.css`). */
export const DIST_LAYERS_CSS = "layers.css";

/** The one-request bundle: everything `src/index.css` imports, in its order. */
export const DIST_BUNDLE_CSS = "zazz.css";

/** The cascade-layer order statement, the first file of every load. */
const DIST_LAYERS_SRC = "base/_layers.css";

/** Base layers after `_layers.css`: tokens, style-prop registrations, reset, type. */
const DIST_BASE = [
  "base/_variables.css",
  "base/_properties.css",
  "base/_reset.css",
  "base/_typography.css",
  "base/_view-transitions.css",
];

/** Class utilities + the `.container` layout grid. */
const DIST_UTILITIES_CORE = ["base/_utilities.css", "base/_layout.css"];

/**
 * Style-prop families (ADR-0012), in `index.css` order. The responsive
 * spacing set is a separate opt-in file that must follow `spacing`.
 */
const DIST_UTILITY_FAMILIES: Record<string, string[]> = {
  "utilities-spacing.css": ["base/_utilities-spacing.css"],
  "utilities-spacing-responsive.css": ["base/_utilities-spacing-responsive.css"],
  "utilities-sizing.css": ["base/_utilities-sizing.css"],
  "utilities-grid.css": ["base/_utilities-grid.css"],
  "utilities-flex.css": ["base/_utilities-flex.css"],
  "utilities-color.css": ["base/_utilities-color.css"],
  "utilities-typography.css": ["base/_utilities-typography.css"],
  "utilities-position.css": ["base/_utilities-position.css"],
};

/** Every primitive stylesheet, in cascade order. */
const DIST_PRIMITIVES = CSS_CASCADE_ORDER.flatMap((name) => PRIMITIVES[name]?.css ?? []);

/**
 * The distribution map: `dist/` css file → the `src/`-relative stylesheets it
 * bundles, in order (ADR-0005, SPEC.md §5). This is the source of truth for
 * `scripts/build-dist.mjs`, which emits exactly these files (nothing more)
 * and refuses to build if the `zazz.css` list drifts from the `@import`s of
 * `src/index.css`.
 *
 * Build contract: every file except `layers.css` and `zazz.css` — the
 * "modular" files that `/combine/` URLs assemble a la carte — is prefixed at
 * build time with the bundled `layers.css`, so the order in which they are
 * concatenated cannot change layer precedence. That prefix is not listed in
 * the sources here. `utilities.css` is the union of `utilities-core.css` and
 * every `utilities-<family>.css`; `zazz.css` is the union of everything.
 */
export const DIST_CSS: Record<string, string[]> = {
  [DIST_LAYERS_CSS]: [DIST_LAYERS_SRC],
  "base.css": DIST_BASE,
  "utilities-core.css": DIST_UTILITIES_CORE,
  ...DIST_UTILITY_FAMILIES,
  "utilities.css": [...DIST_UTILITIES_CORE, ...Object.values(DIST_UTILITY_FAMILIES).flat()],
  ...Object.fromEntries(
    CSS_CASCADE_ORDER.map((name) => [`primitives/${name}.css`, PRIMITIVES[name]?.css ?? []]),
  ),
  [DIST_BUNDLE_CSS]: [
    DIST_LAYERS_SRC,
    ...DIST_BASE,
    ...DIST_PRIMITIVES,
    ...DIST_UTILITIES_CORE,
    ...Object.values(DIST_UTILITY_FAMILIES).flat(),
  ],
};

/**
 * Base stylesheets in the exact order `src/index.css` loads them around the
 * primitive imports: `pre` before (layer order first, then tokens, the
 * style-prop registrations, reset, type, view transitions), `post` after
 * (class utilities and layout, then the style-prop family files, which must
 * follow the classes so a prop beats a class on the same element by source
 * order — ADR-0012). The granular CDN head (`head.ts`) and the `zazz-ui`
 * CLI's vendoring both read this inventory; `head.test.ts` guards it against
 * `index.css`. Derived from the dist map above, so the two cannot drift.
 */
export const BASE_CSS: { pre: string[]; post: string[] } = {
  pre: [DIST_LAYERS_SRC, ...DIST_BASE],
  post: [...DIST_UTILITIES_CORE, ...Object.values(DIST_UTILITY_FAMILIES).flat()],
};

// --- Dependency resolution ---

/**
 * @description Resolves a set of primitive names to its full dependency
 * closure — every primitive the requested ones require, transitively. This is
 * the resolution the CLI's `add` and the granular CDN head share.
 *
 * @param names - Primitive names to resolve (keys of `PRIMITIVES`).
 * @returns The closure in canonical cascade order (markup-only members, which
 * have no cascade position, sort last in name order).
 * @throws {Error} On an unknown primitive name.
 * @example
 * resolveClosure(["combobox"]);
 * // ["fields", "badge", "kbd", "button", "popover", "select", "combobox"]
 */
export function resolveClosure(names: string[]): string[] {
  const closure = new Set<string>();
  const visit = (name: string): void => {
    const entry = PRIMITIVES[name];
    if (!entry) throw new Error(`unknown primitive "${name}"`);
    if (closure.has(name)) return;
    closure.add(name);
    for (const dep of entry.primitives) visit(dep);
  };
  for (const name of names) visit(name);

  const position = new Map(CSS_CASCADE_ORDER.map((name, index) => [name, index]));
  return [...closure].sort((a, b) => {
    const pa = position.get(a);
    const pb = position.get(b);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return a.localeCompare(b);
  });
}

// --- Web-component script map (docs previews) ---

export type ExampleScript =
  | "autocomplete"
  | "combobox"
  | "command"
  | "command-actions"
  | "embla"
  | "reveal"
  | "carousel"
  | "checkbox"
  | "lightbox"
  | "menu"
  | "multiselect"
  | "otp"
  | "password"
  | "tabs"
  | "toaster";

/**
 * Emitted script files (relative to the package `src/` root) that implement each
 * web-component script id. This is the single mapping from script ids to files
 * on disk: consumers (like the docs "JS" tab) resolve these against the
 * package's `src/` directory. Entries list dependencies first (`lightbox` needs
 * `carousel.js` loaded before `lightbox.js`). Script ids are example-level and
 * finer-grained than `PRIMITIVES` (e.g. `command-actions`); every file listed
 * here must also be reachable from a `PRIMITIVES` entry (`manifest.test.ts`).
 */
export const WEB_COMPONENT_SCRIPT_FILES: Partial<Record<ExampleScript, string[]>> = {
  autocomplete: [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/autocomplete/autocomplete.js",
  ],
  combobox: [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/combobox/combobox.js",
  ],
  command: [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/command/command.js",
  ],
  "command-actions": [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/command/command.js",
    "primitives/command/command-actions.js",
  ],
  carousel: ["primitives/carousel/carousel.js"],
  checkbox: ["primitives/checkbox/checkbox.js"],
  lightbox: ["primitives/carousel/carousel.js", "primitives/lightbox/lightbox.js"],
  menu: ["primitives/menu/menu.js"],
  multiselect: ["primitives/select/multiselect.js"],
  otp: ["primitives/otp/otp.js"],
  password: ["primitives/password-group/password-group.js"],
  tabs: ["primitives/tabs/tabs.js"],
  toaster: ["primitives/toaster/toaster.js"],
};
