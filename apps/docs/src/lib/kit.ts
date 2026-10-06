/**
 * The one adapter between the site and the installed `@zazz-ui/core` package:
 * where it is on disk, which files are served at `/zazz/*`, and how an example
 * id maps to a file. Server-only (build time): it reads the filesystem.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

/** Root directory of the installed `@zazz-ui/core` package. */
export const PKG_ROOT = path.dirname(path.dirname(require.resolve("@zazz-ui/core/index.css")));

/** The kit's source tree: stylesheets, emitted scripts, example fragments. */
export const SRC_ROOT = path.join(PKG_ROOT, "src");

/** The single-file bundles (`vp run core#build`): `zazz.css`, `zazz.js`, `sri.json`. */
export const DIST_ROOT = path.join(PKG_ROOT, "dist");

/** `src/primitives/<name>/`: one folder per primitive. */
export const PRIMITIVES_ROOT = path.join(SRC_ROOT, "primitives");

/** The installed kit's version, for pinned CDN URLs and install commands. */
export function kitVersion(): string {
  return (
    JSON.parse(readFileSync(path.join(PKG_ROOT, "package.json"), "utf8")) as { version: string }
  ).version;
}

/** Public URL prefix the kit is served under; `${ZAZZ_URL_BASE}/index.css` is the stylesheet. */
export const ZAZZ_URL_BASE = "/zazz";

/**
 * Resolves `relative` inside `root`, or returns `null` when the result would
 * escape it (path traversal): the shared guard for every kit read.
 */
export function resolveWithin(root: string, relative: string): string | null {
  const filePath = path.resolve(root, relative);
  return filePath === root || filePath.startsWith(root + path.sep) ? filePath : null;
}

const SERVED_EXTENSIONS = new Set([".css", ".js", ".json"]);

/**
 * Every file served at `/zazz/*`: the kit's `src/` stylesheets and emitted
 * scripts (what `buildHead({ base: "/zazz" })` links in previews) and, when
 * built, the `dist/` bundles the site itself loads. Paths are URL-relative to
 * `/zazz`. Tests, type declarations, maps, and screenshots are not served.
 */
export function servedFiles(): { path: string; file: string }[] {
  const out: { path: string; file: string }[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__screenshots__") continue;
      const abs = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else if (
        SERVED_EXTENSIONS.has(path.extname(entry.name)) &&
        !/\.(test|d)\.[cm]?[jt]s$/.test(entry.name)
      ) {
        out.push({ path: rel, file: abs });
      }
    }
  };
  walk(SRC_ROOT, "");
  if (existsSync(DIST_ROOT) && statSync(DIST_ROOT).isDirectory()) walk(DIST_ROOT, "");
  return out;
}

/** The media type a served kit file is sent with. */
export function contentType(file: string): string {
  switch (path.extname(file)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function readOrNull(file: string | null): string | null {
  if (!file) return null;
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * One example fragment by id (`"button/button"` → `src/primitives/button/button.html`).
 * The single read point for example markup: the preview iframe and its code
 * tab both render this one string, so no second copy can drift.
 */
export function readExample(id: string): string | null {
  return readOrNull(resolveWithin(PRIMITIVES_ROOT, `${id.replace(/\.html$/, "")}.html`));
}

/** A primitive's own stylesheet (`"button"` → `src/primitives/button/button.css`), or null. */
export function readPrimitiveCss(name: string): string | null {
  if (name === "utilities") return null; // utility demos have no stylesheet of their own
  return readOrNull(resolveWithin(PRIMITIVES_ROOT, path.join(name, `${name}.css`)));
}

/** A kit file by `src/`-relative path (`"primitives/tabs/tabs.js"`), or null. */
export function readKitFile(relative: string): string | null {
  return readOrNull(resolveWithin(SRC_ROOT, relative));
}
