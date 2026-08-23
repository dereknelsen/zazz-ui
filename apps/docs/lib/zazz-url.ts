/**
 * URL-shaped facts about where the kit is served — importable from client
 * components (no node built-ins). The filesystem side of this seam lives in
 * `zazz-package.ts`, which re-exports this constant so server code has one
 * import surface.
 */

/**
 * Public base URL where the kit's `src/` tree is served by
 * `app/zazz/[...path]/route.ts`. `${ZAZZ_URL_BASE}/index.css` is the kit
 * stylesheet — the same path shape the docs teach consumers (`./zazz/index.css`).
 */
export const ZAZZ_URL_BASE = "/zazz";
