/**
 * Loads a page-specific custom element's module when the page was reached by a
 * swap navigation (`data-ui-navigation="swap"`).
 *
 * Each component ships its own `<script>`, so a full page load fetches only
 * what that page renders. A swap replaces `<body>` and runs none of the
 * destination's scripts, so an element first met that way would never be
 * defined. BaseLayout loads this module on every page: after each swap it
 * imports the module of any listed element that is on the page and not yet
 * defined. The imports are dynamic, so nothing here is fetched until needed.
 *
 * Elements on every page (`<theme-toggle>`, in the header) need no entry.
 */
const ISLANDS: Record<string, () => Promise<unknown>> = {
  "hero-scene": () => import("./hero-scene.ts"),
  "theme-builder": () => import("./theme-builder.ts"),
  "fieldnotes-demo": () => import("./fieldnotes.ts"),
};

function load(): void {
  for (const [tag, module] of Object.entries(ISLANDS)) {
    if (!document.querySelector(tag)) continue;
    delete ISLANDS[tag];
    // Already defined when the element's own page script ran first.
    if (customElements.get(tag)) continue;
    // A failed fetch is tried again on the next swap.
    module().catch(() => (ISLANDS[tag] = module));
  }
}

// A swap adds the new `<body>` as a child of `<html>`.
new MutationObserver(load).observe(document.documentElement, { childList: true });
