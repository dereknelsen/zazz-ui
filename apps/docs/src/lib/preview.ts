/**
 * Examples render inline: the site loads the whole kit, so a fragment is plain
 * markup on the page. These helpers place a demo, list the scripts its JS tab
 * shows, and adjust the live copy where the page itself owns something.
 */
import { PRIMITIVES, resolveClosure } from "@zazz-ui/core/manifest.ts";

export interface PreviewMeta {
  /** Inline-axis placement of the demo (centered by default). */
  inline?: "start" | "center" | "end";
  /** Show a diagram instead of the live fragment (the HTML tab still shows it). */
  diagram?: "bands";
}

/**
 * Per-example presentation tweaks. Only deviations from "centered" are listed;
 * the key is the example id (`<primitive>/<example>`).
 */
const META: Record<string, PreviewMeta> = {
  // a live layout needs a page-wide grid to read; the bands diagram does not
  "layout/layout": { diagram: "bands" },
  "mobile-menu/mobile-menu": { inline: "start" },
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

/**
 * The copy of a fragment that renders on the page; the HTML tab shows the
 * fragment as written. Command hotkeys bind for the whole document, so a demo
 * would take mod+k from the site search and browser shortcuts (mod+j) from every
 * reader of the page: the live copy drops them, and its trigger still opens it.
 */
export function liveHtml(html: string): string {
  return html.replace(/\s+data-command-hotkey="[^"]*"/g, "");
}
