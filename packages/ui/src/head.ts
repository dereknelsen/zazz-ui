"use strict";

/**
 * @fileoverview Canonical `<head>` contract for Zazz pages.
 * @description The single owner of everything a Zazz page loads before its own
 * content: meta tags, the Geist fonts block, the one `index.css` stylesheet
 * link, the feature polyfills, the third-party **import map**, the `index.js`
 * module tag, and the theme-persistence script. The docs preview iframe, the
 * kit's example pages (via `scripts/generate-heads.mjs`), and the docs page
 * that teaches head structure all render from this module — there is no other
 * copy to drift.
 *
 * This is a Node/server-side string builder (used at build/render time), not a
 * browser runtime module — it attaches nothing to `window`.
 *
 * Third-party policy: one CDN provider (jsDelivr), exact pinned versions,
 * static package files only (never dynamically generated `/+esm` bundles —
 * jsDelivr regenerates those when its bundler toolchain updates, which would
 * silently invalidate SRI hashes), `sha384` integrity on every URL. ES modules
 * resolve through the import map; classic polyfills load as plain script tags.
 *
 * @example
 * import { buildHead } from "@zazz-ui/ui/head";
 * const head = buildHead({ base: "./zazz" });
 */

// --- Third-party dependency manifest ---

/** One pinned third-party file served from jsDelivr. */
interface CdnDependency {
  /** npm package name — doubles as the import-map specifier for ESM deps. */
  name: string;
  /** Exact pinned version. Bump deliberately; then refresh `integrity`. */
  version: string;
  /** Static file within the package (never a generated `/+esm` bundle). */
  file: string;
  /**
   * `sha384` SRI hash of the pinned file. Regenerate after a version bump:
   * `curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`
   */
  integrity: string;
}

/** The one CDN provider for every third-party resource. */
const CDN = "https://cdn.jsdelivr.net/npm";

/**
 * @description Builds the pinned jsDelivr URL for a dependency.
 *
 * @param dep - The dependency entry.
 * @returns The versioned URL.
 * @private
 */
function cdnUrl(dep: CdnDependency): string {
  return `${CDN}/${dep.name}@${dep.version}/${dep.file}`;
}

/**
 * ES-module dependencies the kit's module graph imports by bare specifier.
 * The import map points each specifier at its pinned static file; in tests and
 * bundlers the same specifiers resolve from `node_modules` instead (the
 * versions here must match the installed packages — `head.test.ts` pins that).
 */
const ESM_DEPENDENCIES: readonly CdnDependency[] = [
  {
    name: "signal-polyfill",
    version: "0.2.2",
    file: "dist/index.js",
    integrity: "sha384-0OqM7OXGT6Oz1z98u/geiFn/FUyz4iWexkXHCvbIGXRRDXl6bp6IKc0j78AQ6DEK",
  },
  {
    name: "embla-carousel",
    version: "8.6.0",
    file: "esm/embla-carousel.esm.js",
    integrity: "sha384-GXjfyU1fSHHeweoYd3rwo7OBKYtkq+JcsDoe8VDRc6znCty2ZTzyVvX1DwqCE+9t",
  },
  {
    name: "embla-carousel-autoplay",
    version: "8.6.0",
    file: "esm/embla-carousel-autoplay.esm.js",
    integrity: "sha384-AX49yBc7zd/CT8ZqNMRiiqqVSV9xfxb27VwEGziPioT3wL4k4C5BW2qwefdWuN4J",
  },
  {
    name: "embla-carousel-auto-scroll",
    version: "8.6.0",
    file: "esm/embla-carousel-auto-scroll.esm.js",
    integrity: "sha384-SPdnL1eic73WfM72zFEf0RJ5PdUC7TL3Yb5jOl1JC3/l4D7EsVxwO8wFnnezlMSu",
  },
  {
    name: "embla-carousel-class-names",
    version: "8.6.0",
    file: "esm/embla-carousel-class-names.esm.js",
    integrity: "sha384-ZWno/FqzYeWE5Ils19GIhep1AZ5bMl0mp9wmm6baTJE4+pjMjOdTnE55SjUQAdVh",
  },
];

/**
 * Feature polyfills loaded as script tags ahead of the kit module: the Popover
 * API (menus, tooltips, the toaster region) and Invoker Commands
 * (`command`/`commandfor`). Native in current engines (2026); the polyfills
 * keep older browsers consistent.
 */
const POLYFILLS: readonly CdnDependency[] = [
  {
    name: "@oddbird/popover-polyfill",
    version: "0.7.2",
    file: "dist/popover.min.js",
    integrity: "sha384-pOVHoXRgxuaWHCRM4KSyfyfRTmdxgjVo1Ux78ZKJ+GjUz4zIzXiTa8XXuDF1R1Sd",
  },
  {
    name: "invokers",
    version: "2.2.2",
    file: "dist/esm/production/compatible.js",
    integrity: "sha384-7vRXDaS2mcW7LheGSA/rxBwIQNEqmWj0OLEOta/+mvw+9Uf5w1vplA5qg8kLQ99u",
  },
];

// --- Head fragments ---

/**
 * @description Renders the Geist fonts block (preconnect + preload + stylesheet).
 *
 * @param display - The `font-display` strategy for the Google Fonts request.
 * @returns The fonts markup.
 * @private
 */
function fontsBlock(display: "swap" | "optional"): string {
  return `<!-- Google Fonts: Geist + Geist Mono (preconnect so the CSS request starts early) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="font" type="font/woff2" crossorigin href="https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFWNOITd.woff2">
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:ital,wght@0,100..900;1,100..900&family=Geist:ital,wght@0,100..900;1,100..900&display=${display}" rel="stylesheet">`;
}

/**
 * @description Renders the import map that resolves the kit's bare specifiers
 * (`signal-polyfill`, `embla-carousel`, …) to pinned jsDelivr URLs, with an
 * `integrity` section covering every mapped file.
 *
 * @returns The import-map script tag.
 * @private
 */
function importMapBlock(): string {
  const imports: Record<string, string> = {};
  const integrity: Record<string, string> = {};
  for (const dep of ESM_DEPENDENCIES) {
    const url = cdnUrl(dep);
    imports[dep.name] = url;
    integrity[url] = dep.integrity;
  }
  const json = JSON.stringify({ imports, integrity }, null, 2);
  return `<!-- Import map: bare specifiers in Zazz scripts resolve to pinned, SRI-checked files -->
<script type="importmap">
${json}
</script>`;
}

/**
 * @description Renders the polyfill script tags. The popover polyfill is a
 * classic script; the invokers compatibility build is a module. Both are
 * deferred, so they execute in document order ahead of `index.js`.
 *
 * @returns The polyfill markup.
 * @private
 */
function polyfillsBlock(): string {
  const [popover, invokers] = POLYFILLS;
  return `<!-- Polyfills: Popover API + Invoker Commands (command/commandfor) -->
<script src="${cdnUrl(popover)}" integrity="${popover.integrity}" crossorigin="anonymous" defer></script>
<script type="module" src="${cdnUrl(invokers)}" integrity="${invokers.integrity}" crossorigin="anonymous" defer></script>`;
}

/**
 * The theme-persistence script. Runs inline (no `defer`) while the parser is
 * still in `<head>`, so `.dark` lands on `<html>` before first paint. The
 * try/catch covers contexts where storage access throws (sandboxed iframes,
 * blocked site data).
 */
const THEME_SCRIPT = `<!-- Theme: apply the persisted (or preferred) scheme before first paint -->
<script>
  (() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = storedTheme ?? (prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {
      document.documentElement.classList.toggle(
        "dark",
        matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }
  })();
</script>`;

// --- Public API ---

/** Options for `buildHead`. */
export interface HeadOptions {
  /**
   * URL prefix to the kit's `src/` contents, no trailing slash — where
   * `index.css` and `index.js` live. Default `"./zazz"` (the documented copy
   * location); the docs preview iframe passes `"/zazz/src"`.
   */
  base?: string;
  /**
   * Load component behavior: the import map, the polyfills, and the
   * `index.js` module. `false` renders a style-only head. Default `true`.
   */
  scripts?: boolean;
  /** Geist font loading; `false` skips the block entirely. Default `"swap"`. */
  fontDisplay?: "swap" | "optional" | false;
  /** Include the inline theme-persistence script (last in head). Default `true`. */
  theme?: boolean;
}

/**
 * @description Builds the canonical Zazz `<head>` contents: meta tags, fonts,
 * the single stylesheet link, and (unless `scripts: false`) the import map,
 * polyfills, and `index.js` module tag, ending with the theme script. Page
 * specifics — `<title>`, prefetch hints, override stylesheets — belong after
 * this block, outside the contract.
 *
 * @param options - See `HeadOptions`.
 * @returns The head markup (no surrounding `<head>` tag).
 * @example
 * buildHead(); // full head for "./zazz"
 * buildHead({ base: "/zazz/src", scripts: false, fontDisplay: "optional" });
 */
export function buildHead(options: HeadOptions = {}): string {
  const { base = "./zazz", scripts = true, fontDisplay = "swap", theme = true } = options;

  const parts: string[] = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<!-- Paint the right theme (background, form controls, scrollbars) before CSS loads -->`,
    `<meta name="color-scheme" content="light dark">`,
  ];

  if (fontDisplay !== false) parts.push(fontsBlock(fontDisplay));

  parts.push(
    `<!-- Zazz styles: one bundle — index.css @imports every layer in cascade order -->`,
    `<link rel="stylesheet" href="${base}/index.css">`,
  );

  if (scripts) {
    parts.push(
      // The import map must precede EVERY module load — including the
      // modulepreload hint — or the browser rejects it and bare specifiers fail.
      importMapBlock(),
      `<link rel="modulepreload" href="${base}/index.js">`,
      polyfillsBlock(),
      `<!-- Zazz behavior: one ES module imports every component script in dependency order -->`,
      `<script type="module" src="${base}/index.js"></script>`,
    );
  }

  if (theme) parts.push(THEME_SCRIPT);

  return parts.join("\n");
}

export { ESM_DEPENDENCIES, POLYFILLS, cdnUrl };
export type { CdnDependency };
