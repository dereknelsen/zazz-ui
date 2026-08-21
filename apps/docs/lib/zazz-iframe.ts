import type { ExampleScript } from "@zazzdesign/ui/manifest";

/**
 * Builds the full HTML document for a component-preview iframe. The example fragment is
 * wrapped in a minimal page that loads the real Zazz stylesheet and (when the example
 * needs behavior) the single `index.js` module, so the iframe is the *only* place Zazz
 * CSS runs on the docs site — fully sandboxed from Tailwind + fumadocs.
 *
 * Styling loads as the single `index.css` bundle by absolute URL from the `/zazz/*` route
 * (see `app/zazz/[...path]/route.ts`); its relative `@import "./*.css"` rules (the
 * base layers followed by every component) resolve against that URL. One request
 * to maintain — the server's brotli/gzip handles transfer size. Pure string building —
 * safe to run on the client.
 */

export interface BuildPreviewOptions {
  /** The example markup fragment (from `readExample`). */
  html: string;
  /** Zazz scripts the example needs; their CDN deps are added automatically. */
  scripts?: ExampleScript[];
  /** Vertical placement of the demo. */
  justify?: "start" | "center" | "end";
  /** Horizontal placement of the demo. */
  align?: "start" | "center" | "end";
  /** Minimum body height in px — keeps overlays (dialogs/popovers) in view. */
  minHeight?: number;
}

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="font" type="font/woff2" crossorigin href="https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFWNOITd.woff2">
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&family=Geist:ital,wght@0,100..900;1,100..900&display=optional" rel="stylesheet">`;

// Native in modern engines; the polyfills keep previews consistent across browsers and
// power tooltips (interestfor), dialogs (command/commandfor), dropdowns/menus (popover).
const POLYFILLS = `
<script src="https://cdn.jsdelivr.net/npm/@oddbird/popover-polyfill@latest" crossorigin="anonymous" defer></script>
<script type="module" src="https://esm.sh/invokers/compatible" crossorigin="anonymous" defer></script>`;

// Prevent any link from navigating away from the preview iframe.
const BLOCK_NAVIGATION = `
<script>
document.addEventListener('click', function(e) {
  var link = e.target.closest('a[href]');
  if (link) e.preventDefault();
}, true);
</script>`;

// Loaded only when an example needs Embla. Order matters: the UMD bundles attach globals
// that embla.js reads, and all are `defer` so execution order follows document order.
const EMBLA_CDN = [
  "https://unpkg.com/embla-carousel/embla-carousel.umd.js",
  "https://unpkg.com/embla-carousel-autoplay/embla-carousel-autoplay.umd.js",
  "https://unpkg.com/embla-carousel-auto-scroll/embla-carousel-auto-scroll.umd.js",
  "https://unpkg.com/embla-carousel-class-names/embla-carousel-class-names.umd.js",
  "https://unpkg.com/embla-carousel-ssr/embla-carousel-ssr.umd.js",
]
  .map((src) => `<script src="${src}" crossorigin="anonymous" defer></script>`)
  .join("\n");

export function buildPreviewDocument({
  html,
  scripts = [],
  minHeight = 0,
  align = "center",
  justify = "center",
}: BuildPreviewOptions): string {
  // One bundle: index.css @imports the base layers (layers, variables, reset) and
  // every component in cascade order. No separate preload — a same-document stylesheet
  // link is already the highest-priority, render-blocking fetch.
  const styles = `<link rel="stylesheet" href="/zazz/src/index.css">`;

  // Embla reads the CDN UMD bundles as globals, so when an example uses a
  // carousel/lightbox they must load (as `defer` scripts) *before* the index.js
  // module. Defer scripts and module scripts execute in document order, so the
  // CDN tags below precede the module tag.
  const needsEmbla =
    scripts.includes("embla") || scripts.includes("carousel") || scripts.includes("lightbox");
  const emblaCdn = needsEmbla ? EMBLA_CDN : "";

  // One ES module bundles every component script (utils, reveal, embla, carousel,
  // lightbox, password, tabs, navigation) — see the package's src/index.ts. It's loaded
  // only when the example needs Zazz behavior; static examples skip it entirely.
  // navigation.js rides along but is inert here: the preview has no <main> to swap
  // and BLOCK_NAVIGATION already cancels link clicks before any navigation starts.
  const scriptTags =
    scripts.length > 0 ? `<script type="module" src="/zazz/src/index.js"></script>` : "";

  return /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
${FONTS}
${styles}
${POLYFILLS}
${BLOCK_NAVIGATION}
${emblaCdn}
${scriptTags}
<script>
  /**
   * Synchronizes the preview theme with the user's preference.
   * - Reads "theme" from localStorage.
   * - Falls back to "prefers-color-scheme: dark" media query if unset.
   * - Applies the "dark" class to document.documentElement if theme is "dark".
   * - Saves the resolved theme to localStorage for consistency.
   * This block runs synchronously before dom load to prevent theme flash on load.
   */
  (() => {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  })();
</script>
<style>
  html, body { margin: 0; background: var(--background); color: var(--foreground); block-size: 100%; inline-size: 100%; overflow: clip; }
  .zazz-preview {
    display: grid;
    box-sizing: border-box;
    /* Fallback first: 'safe center' is dropped by engines that don't know 'safe'. */
    align-content: ${align};
    align-content: safe ${align};
    justify-items: ${justify};
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
