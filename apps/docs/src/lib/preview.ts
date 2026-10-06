/**
 * Builds the document a preview iframe renders: the kit's head (fonts, the
 * stylesheet, and the scripts when the example needs them) around one example
 * fragment, centered in a padded stage. Pure string building.
 */
import { PRIMITIVES, resolveClosure } from "@zazz-ui/core/manifest";
import { previewHead } from "./head.ts";

export interface PreviewMeta {
  /** Block-axis placement of the demo. */
  block?: "start" | "center" | "end";
  /** Inline-axis placement of the demo. */
  inline?: "start" | "center" | "end";
  /** Minimum stage height in px, so overlays (dialogs, menus) have room. */
  minHeight?: number;
  /** Force scripts on for a fragment whose primitive is CSS-only but composes a scripted one. */
  scripts?: boolean;
}

/**
 * Per-example presentation tweaks. Only deviations from "centered, no minimum
 * height" are listed; the key is the example id (`<primitive>/<example>`).
 */
const META: Record<string, PreviewMeta> = {
  "tooltip/tooltip": { minHeight: 180 },
  "tooltip/tooltip-with-kbd": { minHeight: 180 },
  "tooltip/tooltip-sides": { minHeight: 260 },
  "tooltip/tooltip-disabled": { minHeight: 180 },
  "dialog/dialog": { minHeight: 500 },
  "dialog/dialog-with-form": { minHeight: 800 },
  "alert-dialog/alert-dialog": { minHeight: 500 },
  "menu/menu": { block: "start", minHeight: 500 },
  "menu/menu-interest": { block: "start", minHeight: 400 },
  "menubar/menubar": { block: "start", minHeight: 420 },
  "menubar/menubar-help-search": { block: "start", minHeight: 560, scripts: true },
  "navigation-menu/navigation-menu": { block: "start", minHeight: 500 },
  "navigation-menu/navigation-menu-interest": { block: "start", minHeight: 480 },
  "navigation-menu/navigation-menu-featured": { block: "start", minHeight: 520 },
  "navigation-menu/navigation-menu-icon-grid": { block: "start", minHeight: 520 },
  "navigation-menu/navigation-menu-megamenu": { block: "start", minHeight: 520 },
  "navigation-menu/navigation-menu-simple": { block: "start", minHeight: 480 },
  "select/select": { minHeight: 240 },
  "select/select-align": { block: "start", minHeight: 340 },
  "select/select-sides": { minHeight: 420 },
  "select/select-multiple": { block: "start", minHeight: 480 },
  "toaster/toaster": { minHeight: 420 },
  "autocomplete/autocomplete": { block: "start", minHeight: 480 },
  "autocomplete/autocomplete-groups": { block: "start", minHeight: 520 },
  "combobox/combobox": { block: "start", minHeight: 480 },
  "combobox/combobox-multiselect": { block: "start", minHeight: 520 },
  "command/command": { block: "start", minHeight: 560 },
  "command/command-dialog": { block: "start", minHeight: 640 },
  "command/command-actions": { block: "start", minHeight: 560, scripts: true },
  "carousel/carousel": { minHeight: 460 },
  "lightbox/lightbox": { minHeight: 640 },
  "card/card": { minHeight: 500 },
  "card/card-subgrid": { minHeight: 500 },
  "prose/prose": { minHeight: 500 },
  "breadcrumbs/breadcrumbs": { minHeight: 120 },
  "avatar/avatar": { minHeight: 160 },
  "accordion/accordion": { block: "start", minHeight: 460 },
  "tabs/tabs": { minHeight: 460 },
  "mobile-menu/mobile-menu": { block: "start", inline: "start", minHeight: 500 },
  "toolbar/toolbar": { minHeight: 240 },
  "separator/separator": { minHeight: 200 },
  "input/input": { block: "start", minHeight: 420 },
  "input/input-icon-leading": { block: "start" },
  "input/input-icon-trailing": { block: "start" },
  "input-group/input-group": { block: "start", minHeight: 420 },
  "otp/otp": { block: "start" },
};

let previewCounter = 0;

/** A per-build sequence for radio names and ids, so the HTML is deterministic. */
export function nextPreviewId(): number {
  return ++previewCounter;
}

/** Every example id with presentation tweaks (tested against the kit). */
export const PREVIEW_META_IDS: readonly string[] = Object.keys(META);

export function previewMeta(id: string): PreviewMeta {
  return META[id.replace(/\.html$/, "")] ?? {};
}

/** The example's primitive (`"button/button"` → `"button"`). */
export function primitiveOf(id: string): string {
  return id.split("/")[0];
}

/**
 * The emitted scripts an example runs: the primitive's own and its
 * dependencies', from the kit manifest (`src/`-relative paths). Empty for a
 * CSS-only primitive.
 */
export function scriptsFor(id: string): string[] {
  const name = primitiveOf(id);
  if (!(name in PRIMITIVES)) return [];
  return resolveClosure([name]).flatMap((n) => PRIMITIVES[n].js);
}

// Links inside a preview would navigate the iframe away from the demo.
const BLOCK_NAVIGATION = `<script>
document.addEventListener("click", (e) => { if (e.target.closest("a[href]")) e.preventDefault(); }, true);
</script>`;

export function buildPreviewDocument(html: string, meta: PreviewMeta, scripts: boolean): string {
  const { block = "center", inline = "center", minHeight = 0 } = meta;
  return `<!doctype html>
<html lang="en">
<head>
${previewHead({ scripts })}
${BLOCK_NAVIGATION}
<style>
  html, body { margin: 0; block-size: 100%; inline-size: 100%; overflow: clip; background: var(--color-background); color: var(--color-foreground); }
  main { display: grid; box-sizing: border-box; align-content: ${block}; align-content: safe ${block}; justify-items: ${inline}; gap: var(--space-md); padding: var(--space-md); inline-size: 100%; block-size: 100%; min-block-size: ${minHeight}px; overflow-y: auto; overflow-x: clip; }
</style>
</head>
<body>
<main data-preview-stage>
${html}
</main>
</body>
</html>`;
}
