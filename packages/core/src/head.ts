"use strict";

/**
 * @fileoverview Canonical `<head>` contract for Zazz pages.
 * @description The single owner of everything a Zazz page loads before its own
 * content: meta tags, the Geist fonts block, the one `index.css` stylesheet
 * link, the feature polyfill, the third-party **import map**, the `index.js`
 * module tag, and the theme-persistence script. The docs preview iframe, the
 * kit's example pages (via `scripts/generate-heads.mjs`), and the docs page
 * that teaches head structure all render from this module: there is no other
 * copy to drift.
 *
 * This is a Node/server-side string builder (used at build/render time), not a
 * browser runtime module; it attaches nothing to `window`.
 *
 * Third-party policy: one CDN provider (jsDelivr), exact pinned versions,
 * static package files only (never dynamically generated `/+esm` bundles,
 * as jsDelivr regenerates those when its bundler toolchain updates, which would
 * silently invalidate SRI hashes), `sha384` integrity on every URL. ES modules
 * resolve through the import map; the polyfill loads as its own module tag.
 *
 * @example
 * import { buildHead } from "@zazz-ui/core/head";
 * const head = buildHead({ base: "./zazz" });
 */

import { PRIMITIVES, resolveClosure } from "./manifest.ts";

// --- Third-party dependency manifest ---

/** One pinned third-party file served from jsDelivr. */
interface CdnDependency {
  /** npm package name: doubles as the import-map specifier for ESM deps. */
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

/** The kit's own published package name (CDN mode serves files out of it). */
const PACKAGE_NAME = "@zazz-ui/core";

/**
 * Exact-version pin required in every kit CDN URL. SRI hashes are per-byte,
 * so floating specs (`latest`, `0.3`) would break integrity on each release —
 * and unpinned URLs defeat jsDelivr's permanent caching (ticket 06).
 */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * Base stylesheets in the exact order `src/index.css` loads them around the
 * primitive imports: `PRE` before (layer declaration first), `POST` after
 * (utilities and layout stay the final normal override layer). The granular
 * CDN head mirrors this split; `head.test.ts` guards it against `index.css`.
 */
const BASE_CSS_PRE = [
  "base/_layers.css",
  "base/_variables.css",
  "base/_reset.css",
  "base/_typography.css",
  "base/_view-transitions.css",
];
const BASE_CSS_POST = ["base/_utilities.css", "base/_layout.css"];

/**
 * Core runtime modules reached by relative import from primitive scripts
 * (never via their own script tag, except `dialog-lifecycle`, which is a
 * side-effect module the granular head loads explicitly). Listed so the
 * import map's `integrity` section can cover their transitive loads.
 */
const CORE_RUNTIME_JS = [
  "base/dialog-lifecycle.js",
  "base/utils.js",
  "base/signals.js",
  "base/zazz-element.js",
];

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
 * versions here must match the installed packages: `head.test.ts` pins that).
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
 * Feature polyfills loaded ahead of the kit module. Exactly one entry:
 * **Interest Invokers** (`interestfor`), which drives tooltip triggers and the
 * optional hover/focus open on menu, menubar, and navigation-menu. Chromium
 * 142+ ships it; Firefox and Safari do not, so this is the kit's one API below
 * the browser-support floor that a polyfill can cover (ADR-0011).
 *
 * Deliberately *not* polyfilled any more (all native across the support
 * window): the **Popover API** (Chrome 114, Firefox 125, Safari 17, iOS 18.3)
 * and **Invoker Commands** `command`/`commandfor` (Chrome 135, Firefox 144,
 * Safari 26.2). CSS anchor positioning is below the floor but has no polyfill
 * here — the components gate it behind `@supports` instead.
 */
const POLYFILLS: readonly CdnDependency[] = [
  {
    name: "invokers",
    version: "2.2.2",
    file: "dist/esm/production/interest.js",
    integrity: "sha384-hR2BVNtsS7fIIMwOm+f7MY0JZfuByGhQQfevCBB6evFATKzBsTw0JzH/RxD94z2T",
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
function importMapBlock(extraIntegrity: Record<string, string> = {}): string {
  const imports: Record<string, string> = {};
  const integrity: Record<string, string> = { ...extraIntegrity };
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
 * @description Renders the polyfill script tag. The invokers interest build is
 * an ES module, so it is deferred by default and executes in document order —
 * ahead of the `index.js` module tag that follows it.
 *
 * @returns The polyfill markup.
 * @private
 */
function polyfillsBlock(): string {
  const [interest] = POLYFILLS;
  return `<!-- Polyfill: Interest Invokers (interestfor) — native in Chromium only -->
<script type="module" src="${cdnUrl(interest)}" integrity="${interest.integrity}" crossorigin="anonymous"></script>`;
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

/** CDN mode for `buildHead` — kit files served from jsDelivr (ticket 06). */
export interface CdnHeadOptions {
  /** Exact published `@zazz-ui/core` version (`"0.1.0"`; never a dist-tag). */
  version: string;
  /**
   * Granular grain: the primitives this page uses. Their dependency closure
   * (via the kit manifest) decides which css/js files load. Omit for the
   * bundle grain (`dist/zazz.css` + `dist/zazz.js`, whole kit, two requests).
   */
  primitives?: string[];
  /**
   * The version's `dist/sri.json` contents (package-relative path → sha384).
   * When provided, every kit URL gets `integrity` + `crossorigin` (links and
   * script tags directly; transitive module imports via the import map's
   * `integrity` section). Omitted → plain pinned URLs.
   */
  sri?: Record<string, string>;
}

/** Options for `buildHead`. */
export interface HeadOptions {
  /**
   * URL prefix to the kit's `src/` contents, no trailing slash — where
   * `index.css` and `index.js` live. Default `"./zazz"` (the documented copy
   * location); the docs preview iframe passes `"/zazz/src"`.
   */
  base?: string;
  /**
   * Serve the kit from jsDelivr instead of a local copy: pinned, optionally
   * SRI-checked URLs into the published package. Mutually exclusive with
   * `base`.
   */
  cdn?: CdnHeadOptions;
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
 * specifics (`<title>`, prefetch hints, override stylesheets) belong after
 * this block, outside the contract.
 *
 * @param options - See `HeadOptions`.
 * @returns The head markup (no surrounding `<head>` tag).
 * @example
 * buildHead(); // full head for "./zazz"
 * buildHead({ base: "/zazz/src", scripts: false, fontDisplay: "optional" });
 */
export function buildHead(options: HeadOptions = {}): string {
  const { base = "./zazz", cdn, scripts = true, fontDisplay = "swap", theme = true } = options;

  const parts: string[] = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<!-- Paint the right theme (background, form controls, scrollbars) before CSS loads -->`,
    `<meta name="color-scheme" content="light dark">`,
  ];

  if (fontDisplay !== false) parts.push(fontsBlock(fontDisplay));

  if (cdn) {
    parts.push(...cdnBlocks(cdn, scripts));
  } else {
    parts.push(
      `<!-- Zazz styles: one bundle (index.css @imports every layer in cascade order) -->`,
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
  }

  if (theme) parts.push(THEME_SCRIPT);

  return parts.join("\n");
}

// --- CDN mode ---

/**
 * @description Renders the style/behavior blocks for CDN mode: the bundle
 * grain (two `dist/` requests, whole kit) or, when `primitives` is given, the
 * granular grain — base layers in cascade order, the dependency closure's
 * stylesheets, and one module tag per closure script (relative imports between
 * kit files resolve natively on jsDelivr; only bare specifiers need the map).
 *
 * @param cdn - The CDN options (exact version, optional primitives + sri).
 * @param scripts - Whether behavior loads at all (`HeadOptions.scripts`).
 * @returns The head fragments between the fonts block and the theme script.
 * @private
 */
function cdnBlocks(cdn: CdnHeadOptions, scripts: boolean): string[] {
  const { version, primitives, sri } = cdn;
  if (!EXACT_VERSION.test(version)) {
    throw new Error(
      `CDN URLs must pin an exact version (got "${version}"); ` +
        `dist-tags and ranges break SRI and permanent caching`,
    );
  }
  const url = (path: string): string => `${CDN}/${PACKAGE_NAME}@${version}/${path}`;
  const attrs = (path: string): string => {
    const hash = sri?.[path];
    return hash ? ` integrity="${hash}" crossorigin="anonymous"` : "";
  };
  const parts: string[] = [];

  if (!primitives) {
    parts.push(
      `<!-- Zazz styles: the whole kit, one request -->`,
      `<link rel="stylesheet" href="${url("dist/zazz.css")}"${attrs("dist/zazz.css")}>`,
    );
    if (scripts) {
      parts.push(
        importMapBlock(),
        `<link rel="modulepreload" href="${url("dist/zazz.js")}"${attrs("dist/zazz.js")}>`,
        polyfillsBlock(),
        `<!-- Zazz behavior: the whole kit, one module -->`,
        `<script type="module" src="${url("dist/zazz.js")}"${attrs("dist/zazz.js")}></script>`,
      );
    }
    return parts;
  }

  const closure = resolveClosure(primitives);

  const css = [
    ...BASE_CSS_PRE,
    ...closure.flatMap((name) => PRIMITIVES[name]?.css ?? []),
    ...BASE_CSS_POST,
  ];
  parts.push(
    `<!-- Zazz styles: base layers, then ${closure.join(", ")} in cascade order -->`,
    ...css.map(
      (path) => `<link rel="stylesheet" href="${url(`src/${path}`)}"${attrs(`src/${path}`)}>`,
    ),
  );

  if (scripts) {
    // Side-effect modules need their own tag (nothing imports them); the rest
    // of each primitive's chain loads through native relative imports. The
    // core dialog-lifecycle module always leads: dialogs, menus, and popovers
    // assume its lifecycle events. The polyfill stays in even for css-only
    // closures — tooltip is styles-only but its trigger is `interestfor`.
    const scriptFiles = [
      ...new Set([
        "base/dialog-lifecycle.js",
        ...closure.flatMap((name) => {
          const entry = PRIMITIVES[name];
          return entry ? [...entry.base, ...entry.js] : [];
        }),
      ]),
    ];
    // Transitively imported core modules never get a tag, so their integrity
    // rides in the import map's integrity section instead.
    const transitive: Record<string, string> = {};
    if (sri) {
      for (const path of CORE_RUNTIME_JS) {
        const hash = sri[`src/${path}`];
        if (hash) transitive[url(`src/${path}`)] = hash;
      }
    }
    parts.push(
      importMapBlock(transitive),
      polyfillsBlock(),
      `<!-- Zazz behavior: side-effect modules by tag; the rest via module imports -->`,
      ...scriptFiles.map(
        (path) =>
          `<script type="module" src="${url(`src/${path}`)}"${attrs(`src/${path}`)}></script>`,
      ),
    );
  }

  return parts;
}

export { ESM_DEPENDENCIES, POLYFILLS, cdnUrl };
export type { CdnDependency };
