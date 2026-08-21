/**
 * Per-example presentation metadata for the docs previews. Keyed by example id
 * (`"<component>/<example>"`, matching `src/ui/<id>.html`).
 *
 * Only deviations from the defaults need an entry — anything omitted renders
 * left-aligned with no minimum height and no scripts. Set `minHeight` for components
 * whose UI escapes the trigger (dialogs, popovers, dropdowns, the select picker) so the
 * overlay has room inside the iframe, and `requiresScripts` for anything JS-driven.
 */

export type ExampleScript =
  | "embla"
  | "reveal"
  | "carousel"
  | "lightbox"
  | "password"
  | "tabs"
  | "toaster";

export interface ExampleMeta {
  /** Human label for the iframe `title` (a11y). */
  title?: string;
  /** Vertical placement of the demo. */
  justify?: "start" | "center" | "end";
  /** Horizontal placement of the demo within the preview frame. */
  align?: "start" | "center" | "end";
  /** Minimum iframe height in px — gives overlays/popovers room to render. */
  minHeight?: number;
  /** Zazz scripts to load (plus their CDN deps). Default: none. */
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
  "dropdown/default": { align: "start", minHeight: 500 },
  "navigation-menu/default": { align: "start", minHeight: 500, requiresScripts: ["password"] },
  "select/default": { minHeight: 240 },
  "select/align": { align: "start", minHeight: 340 },
  "select/sides": { minHeight: 420 },
  "toaster/default": { minHeight: 420, requiresScripts: ["toaster"] },

  // Carousel/lightbox — web components pull in embla.js + the Embla CDN bundles.
  "carousel/default": { minHeight: 460, requiresScripts: ["carousel"] },
  "lightbox/default": { minHeight: 640, requiresScripts: ["lightbox"] },

  // Showcase primitives — centered reads better than left-pinned.
  "card/default": { minHeight: 500 },
  "card/subgrid": { minHeight: 500 },
  "prose/default": { minHeight: 500 },
  "breadcrumbs/default": { minHeight: 120 },
  "avatar/default": { minHeight: 160 },
  "accordion/default": { align: "start", minHeight: 460 },
  "tabs/default": { minHeight: 460, requiresScripts: ["tabs"] },
  "mobile-menu/default": { align: "start", justify: "start", minHeight: 500 },

  // Forms
  "input/default": { align: "start", minHeight: 420 },
  "input/icon-leading": { align: "start" },
  "input/icon-trailing": { align: "start" },
  "input-group/default": { align: "start", minHeight: 420 },
  "input-group/password-group": { requiresScripts: ["password"] },
  "password-group/default": { requiresScripts: ["password"] },
};

/** Returns presentation metadata for an example id, or `undefined` for defaults. */
export function getExampleMeta(src: string): ExampleMeta | undefined {
  return MANIFEST[src.replace(/\.html$/, "")];
}

/**
 * Emitted script files (relative to the package `src/` root) that implement each
 * web-component script id. This is the single mapping from manifest script ids to
 * files on disk — consumers (like the docs "JS" tab) resolve these against the
 * package's `src/` directory. Entries list dependencies first (`lightbox` needs
 * `carousel.js` loaded before `lightbox.js`).
 */
export const WEB_COMPONENT_SCRIPT_FILES: Partial<Record<ExampleScript, string[]>> = {
  carousel: ["ui/carousel/carousel.js"],
  lightbox: ["ui/carousel/carousel.js", "ui/lightbox/lightbox.js"],
  password: ["ui/password-group/password-group.js"],
  tabs: ["ui/tabs/tabs.js"],
  toaster: ["ui/toaster/toaster.js"],
};
