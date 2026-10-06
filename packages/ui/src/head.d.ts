/**
 * @fileoverview Canonical `<head>` contract for Zazz pages.
 * @description The single owner of everything a Zazz page loads before its own
 * content: meta tags, the one `index.css` stylesheet
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
/**
 * @description Builds the pinned jsDelivr URL for a dependency.
 *
 * @param dep - The dependency entry.
 * @returns The versioned URL.
 * @private
 */
declare function cdnUrl(dep: CdnDependency): string;
/**
 * ES-module dependencies the kit's module graph imports by bare specifier.
 * The import map points each specifier at its pinned static file; in tests and
 * bundlers the same specifiers resolve from `node_modules` instead (the
 * versions here must match the installed packages — `head.test.ts` pins that).
 */
declare const ESM_DEPENDENCIES: readonly CdnDependency[];
/**
 * Feature polyfills loaded as script tags ahead of the kit module: the Popover
 * API (menus, tooltips, the toaster region) and Invoker Commands
 * (`command`/`commandfor`). Native in current engines (2026); the polyfills
 * keep older browsers consistent.
 */
declare const POLYFILLS: readonly CdnDependency[];
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
export declare function buildHead(options?: HeadOptions): string;
export { ESM_DEPENDENCIES, POLYFILLS, cdnUrl };
export type { CdnDependency };
//# sourceMappingURL=head.d.ts.map
