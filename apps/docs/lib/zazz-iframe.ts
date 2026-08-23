import { buildHead } from "@zazzdesign/ui/head";
import type { ExampleScript } from "@zazzdesign/ui/manifest";
import { ZAZZ_URL_BASE } from "@/lib/zazz-url";

/**
 * Builds the full HTML document for a component-preview iframe. The example fragment is
 * wrapped in a minimal page that loads the real Zazz stylesheet and (when the example
 * needs behavior) the single `index.js` module, so the iframe is the *only* place Zazz
 * CSS runs on the docs site — fully sandboxed from Tailwind + fumadocs.
 *
 * The head comes from the kit's own head contract (`@zazzdesign/ui/head`) with
 * `base: ZAZZ_URL_BASE` — the `/zazz/*` route serves the workspace package's `src/`
 * tree raw (see `app/zazz/[...path]/route.ts`). One implementation of the head to
 * maintain; the preview adds only its own concerns (navigation blocking, demo
 * placement styles). Pure string building — safe to run on the client.
 */

export interface BuildPreviewOptions {
  /** The example markup fragment (from `readExample`). */
  html: string;
  /** Zazz scripts the example needs; any script loads the whole `index.js` module. */
  scripts?: ExampleScript[];
  /** Block-axis (vertical) placement of the demo — drives `align-content`. */
  block?: "start" | "center" | "end";
  /** Inline-axis (horizontal) placement of the demo — drives `justify-items`. */
  inline?: "start" | "center" | "end";
  /** Minimum body height in px — keeps overlays (dialogs/popovers) in view. */
  minHeight?: number;
}

// Prevent any link from navigating away from the preview iframe.
const BLOCK_NAVIGATION = `
<script>
document.addEventListener('click', function(e) {
  var link = e.target.closest('a[href]');
  if (link) e.preventDefault();
}, true);
</script>`;

export function buildPreviewDocument({
  html,
  scripts = [],
  minHeight = 0,
  block = "center",
  inline = "center",
}: BuildPreviewOptions): string {
  // The canonical head: metas, fonts (`optional` — previews should never flash
  // fallback text), one stylesheet, and — only when the example needs behavior —
  // the import map, polyfills, and the single index.js module.
  const head = buildHead({
    base: ZAZZ_URL_BASE,
    scripts: scripts.length > 0,
    fontDisplay: "optional",
  });

  return /* html */ `<!doctype html>
<html lang="en">
<head>
${head}
${BLOCK_NAVIGATION}
<style>
  html, body { margin: 0; background: var(--background); color: var(--foreground); block-size: 100%; inline-size: 100%; overflow: clip; }
  .zazz-preview {
    display: grid;
    box-sizing: border-box;
    /* Fallback first: 'safe center' is dropped by engines that don't know 'safe'. */
    align-content: ${block};
    align-content: safe ${block};
    justify-items: ${inline};
    gap: var(--gap-md);
    padding: var(--gap-md);
    inline-size: 100%;
    block-size: 100%;
    min-block-size: ${minHeight}px;
    overflow-y: auto;
    overflow-x: clip;
  }
</style>
</head>
  <body>
    <main class="zazz-preview">
      ${html}
    </main>
  </body>
</html>`;
}
