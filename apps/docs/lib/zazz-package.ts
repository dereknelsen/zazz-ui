// Server-only: resolves the installed @zazz-ui/core package on disk. Do not
// import from a client component — use `ZAZZ_URL_BASE` (re-exported from
// `zazz-url.ts`) for URL-shaped facts instead.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export { ZAZZ_URL_BASE } from "./zazz-url";

/**
 * The one adapter between the docs app and the kit's internal layout. Every
 * path-shaped fact about `@zazz-ui/core` lives here — where the package is,
 * which subtree is served over HTTP, and how ids map to files — so a rename
 * inside the kit is a one-file edit on this side of the seam, and the trace
 * script can't drift from what the route actually serves.
 *
 * Consumers: `app/zazz/[...path]/route.ts` (serves `SERVED_ROOT`),
 * `lib/zazz-assets.ts` (reads examples/css/js), `scripts/patch-zazz-trace.mjs`
 * (traces `SERVED_ROOT` — kept in sync by convention, it cannot import TS).
 */

// Anchor module resolution at the app directory rather than import.meta.url — the
// bundler rewrites import.meta.url in compiled server code, which breaks createRequire.
const require = createRequire(path.join(process.cwd(), "package.json"));

/**
 * Locates the installed @zazz-ui/core package. require.resolve is the source
 * of truth in dev and local prod, but it depends on the pnpm workspace symlink
 * chain — which deployment bundlers that reassemble the filesystem from a
 * trace (Vercel) don't reliably recreate. The fallbacks walk the layouts we
 * actually deploy into, keyed off whatever cwd the server runs with; a miss
 * throws with the full list so the function log says exactly what was tried.
 */
function resolvePkgRoot(): string {
  try {
    return path.dirname(require.resolve("@zazz-ui/core/package.json"));
  } catch {
    const candidates = [
      path.join(process.cwd(), "node_modules/@zazz-ui/core"), // symlink survived, resolver didn't
      path.join(process.cwd(), "../../packages/core"), // cwd = apps/docs in the monorepo layout
      path.join(process.cwd(), "packages/core"), // cwd = repo root (traced bundle)
      path.join(process.cwd(), "apps/docs/node_modules/@zazz-ui/core"),
    ];
    for (const dir of candidates) {
      if (existsSync(path.join(dir, "src", "index.css"))) return dir;
    }
    throw new Error(
      `@zazz-ui/core not found (cwd=${process.cwd()}); tried require.resolve and: ${candidates.join(", ")}`,
    );
  }
}

/** Root directory of the installed @zazz-ui/core package. */
export const PKG_ROOT = resolvePkgRoot();

/** The kit's source tree — stylesheets, emitted scripts, example fragments. */
export const SRC_ROOT = path.join(PKG_ROOT, "src");

/** Component folders (`src/primitives/<name>/`). */
export const COMPONENTS_ROOT = path.join(SRC_ROOT, "primitives");

/**
 * The subtree the `/zazz/*` route serves. Serving `src/` (not the package
 * root) makes the docs' own URLs match the paths the prose teaches consumers:
 * `/zazz/index.css` here ≡ `./zazz/index.css` on a consumer site that copied
 * `src/` into `./zazz/`.
 */
export const SERVED_ROOT = SRC_ROOT;

/**
 * Resolves `relative` inside `root`, or returns `null` when the resolved path
 * would escape it (path traversal) — the shared guard for every kit read.
 */
export function resolveWithin(root: string, relative: string): string | null {
  const filePath = path.resolve(root, relative);
  return filePath === root || filePath.startsWith(root + path.sep) ? filePath : null;
}

/** Absolute path of an example fragment id (`"button/variants"`), or null. */
export function exampleFile(id: string): string | null {
  return resolveWithin(COMPONENTS_ROOT, `${id.replace(/\.html$/, "")}.html`);
}

/** Absolute path of a component's own stylesheet (`"button"` → `button/button.css`), or null. */
export function componentCssFile(component: string): string | null {
  return resolveWithin(COMPONENTS_ROOT, path.join(component, `${component}.css`));
}

/** Absolute path of an emitted script (relative to `src/`, per the kit's manifest), or null. */
export function scriptFile(relative: string): string | null {
  return resolveWithin(SRC_ROOT, relative);
}
