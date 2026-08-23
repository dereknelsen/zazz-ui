import type { ExampleScript } from "@zazzdesign/ui/manifest";

/**
 * Per-example presentation metadata for the docs preview iframes. Keyed by
 * example id (`"<component>/<example>"`, matching `src/ui/<id>.html` in the
 * kit). This is docs-site state — iframe pixels and placement — so it lives
 * beside the iframe that reads it, not in the published package (ADR: the kit
 * ships kit facts only; see `@zazzdesign/ui/manifest` for the script map).
 *
 * Only deviations from the defaults need an entry — anything omitted renders
 * centered with no minimum height and no scripts. Set `minHeight` for
 * components whose UI escapes the trigger (dialogs, popovers, dropdowns, the
 * select picker) so the overlay has room inside the iframe, and
 * `requiresScripts` for anything JS-driven.
 */
export interface ExampleMeta {
  /** Human label for the iframe `title` (a11y). */
  title?: string;
  /** Block-axis (vertical) placement of the demo — drives `align-content`. */
  block?: "start" | "center" | "end";
  /** Inline-axis (horizontal) placement of the demo — drives `justify-items`. */
  inline?: "start" | "center" | "end";
  /** Minimum iframe height in px — gives overlays/popovers room to render. */
  minHeight?: number;
  /** Zazz scripts to load (plus their import-map deps). Default: none. */
  requiresScripts?: ExampleScript[];
}

const MANIFEST: Record<string, ExampleMeta> = {
  // Overlays — need vertical room so the popover/dialog/menu shows in-frame.
  "tooltip/default": { minHeight: 180 },
  "tooltip/with-kbd": { minHeight: 180 },
  "tooltip/sides": { minHeight: 260 },
  "tooltip/disabled": { minHeight: 180 },
  "dialog/default": { minHeight: 500 },
  "dialog/with-form": { minHeight: 800 },
  "dialog/is-alert": { minHeight: 500 },
  "dropdown/default": { block: "start", minHeight: 500 },
  "navigation-menu/default": { block: "start", minHeight: 500, requiresScripts: ["password"] },
  "select/default": { minHeight: 240 },
  "select/align": { block: "start", minHeight: 340 },
  "select/sides": { minHeight: 420 },
  "toaster/default": { minHeight: 420, requiresScripts: ["toaster"] },

  // Carousel/lightbox — web components pull in embla.js via the import map.
  "carousel/default": { minHeight: 460, requiresScripts: ["carousel"] },
  "lightbox/default": { minHeight: 640, requiresScripts: ["lightbox"] },

  // Showcase primitives — centered reads better than left-pinned.
  "card/default": { minHeight: 500 },
  "card/subgrid": { minHeight: 500 },
  "prose/default": { minHeight: 500 },
  "breadcrumbs/default": { minHeight: 120 },
  "avatar/default": { minHeight: 160 },
  "accordion/default": { block: "start", minHeight: 460 },
  "tabs/default": { minHeight: 460, requiresScripts: ["tabs"] },
  "mobile-menu/default": { block: "start", inline: "start", minHeight: 500 },

  // Forms
  "input/default": { block: "start", minHeight: 420 },
  "input/icon-leading": { block: "start" },
  "input/icon-trailing": { block: "start" },
  "input-group/default": { block: "start", minHeight: 420 },
  "input-group/password-group": { requiresScripts: ["password"] },
  "password-group/default": { requiresScripts: ["password"] },
};

/** Returns presentation metadata for an example id, or `undefined` for defaults. */
export function getExampleMeta(src: string): ExampleMeta | undefined {
  return MANIFEST[src.replace(/\.html$/, "")];
}
