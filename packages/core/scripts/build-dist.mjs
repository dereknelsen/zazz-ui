// @ts-nocheck -- Node-only build script; the repo-root tsconfig used for loose
// files has no @types/node, so `node:*` imports can't type-check here.

/**
 * @fileoverview Emits every CSS file in `dist/` — the one-request `zazz.css`
 * plus the modular map (`layers.css`, `base.css`, `utilities*.css`,
 * `primitives/<name>.css`) that `/combine/` URLs assemble a la carte (ADR-0005,
 * SPEC.md §5).
 * @description Each output is bundled from `src/` with lightningcss (`@import`s
 * inlined, then minified). No browser `targets` are passed on purpose: the kit
 * is authored against the modern floor (CLAUDE.md), and a target list would
 * let lightningcss downlevel `@container style()`, `@property` and
 * `light-dark()` into fallbacks the source never asked for. Every modular
 * file starts with the cascade-layer order from `base/_layers.css`, so the
 * order in which `/combine/` concatenates them cannot change layer precedence.
 * `url()` in the sources are `data:` URIs only, so nothing is rewritten.
 *
 * The file map is `DIST_CSS` in `src/manifest.ts` (the published manifest, so
 * the CLI and docs read the same map); this script imports the compiled
 * `src/manifest.js`, so `tsc` must have run first. `src/index.css` stays the
 * single source of truth for load order: the script parses its plain
 * relative `@import` list and refuses to build if the map's `zazz.css` entry
 * and that list drift apart (a file in one but not the other, or the order
 * differing). Qualified imports (`layer(...)`, media) are rejected — the
 * bundle would silently change their cascade position.
 *
 * Usage: part of `vp run build` (or `node scripts/build-dist.mjs`), after
 * `tsc` and `vp pack` (which owns `dist/zazz.js`) and before
 * `generate-sri.mjs` (so the hashes cover these files).
 */

import { readFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleAsync } from "lightningcss";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

// --- The dist map ---

// The map lives in the published manifest (`DIST_CSS`); the compiled module
// is dependency-free ESM, so Node loads it directly once tsc has emitted it.
let DIST_CSS, DIST_LAYERS_CSS, DIST_BUNDLE_CSS;
try {
  ({ DIST_CSS, DIST_LAYERS_CSS, DIST_BUNDLE_CSS } = await import("../src/manifest.js"));
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") {
    throw new Error("src/manifest.js is missing — run `tsc -p tsconfig.json` first", {
      cause: error,
    });
  }
  throw error;
}
// A manifest.js emitted before the dist map existed loads fine and exports
// nothing useful; say so instead of failing at the first map lookup.
if (DIST_CSS === undefined || DIST_LAYERS_CSS === undefined || DIST_BUNDLE_CSS === undefined) {
  throw new Error("src/manifest.js is stale (no DIST_CSS export) — rerun `tsc -p tsconfig.json`");
}

// --- index.css as the source of truth ---

/**
 * The plain relative `@import` list of `src/index.css`, in order. Qualified
 * imports (`layer(...)`, `supports(...)`, media) throw: bundling would inline
 * them at a different cascade position than the browser gives them.
 * @param {string} css
 * @returns {string[]} `src/`-relative paths
 */
const parseImports = (css) => {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const imports = [];
  for (const match of uncommented.matchAll(/@import\s+([^;]+);/g)) {
    const clause = match[1].trim();
    const quoted = /^(?:url\()?["']([^"']+)["']\)?(.*)$/.exec(clause);
    if (!quoted) throw new Error(`index.css: unsupported @import syntax: ${clause}`);
    const [, specifier, qualifier] = quoted;
    if (qualifier.trim()) {
      throw new Error(`index.css: qualified @import not supported by the dist build: ${clause}`);
    }
    if (!specifier.startsWith("./")) {
      throw new Error(`index.css: @import must be a plain relative path: ${clause}`);
    }
    imports.push(specifier.slice(2));
  }
  return imports;
};

const indexImports = parseImports(await readFile(path.join(SRC, "index.css"), "utf8"));
const zazz = DIST_CSS[DIST_BUNDLE_CSS];
if (zazz.join("\n") !== indexImports.join("\n")) {
  const listed = new Set(zazz);
  const imported = new Set(indexImports);
  const missing = indexImports.filter((file) => !listed.has(file));
  const extra = zazz.filter((file) => !imported.has(file));
  throw new Error(
    `build-dist: the dist map and src/index.css disagree` +
      (missing.length ? `\n  in index.css but not the map: ${missing.join(", ")}` : "") +
      (extra.length ? `\n  in the map but not index.css: ${extra.join(", ")}` : "") +
      (!missing.length && !extra.length ? "\n  same files, different order" : ""),
  );
}

// --- Bundling ---

const ENTRY = "__entry__.css";

/**
 * Bundles a list of `src/`-relative stylesheets into one minified file. The
 * entry is a synthetic `@import` list served from memory by the `read` hook
 * (only `bundleAsync` accepts a resolver); every other file comes from disk.
 * @param {string[]} files
 * @returns {Promise<string>}
 */
const bundleFiles = async (files) => {
  const entry = files.map((file) => `@import "./${file}";`).join("\n");
  const { code, warnings } = await bundleAsync({
    filename: path.join(SRC, ENTRY),
    minify: true,
    resolver: {
      read: (file) => {
        if (path.basename(file) === ENTRY) return entry;
        return readFileSync(file, "utf8");
      },
    },
  });
  for (const warning of warnings) {
    console.warn(
      `  warning (${path.relative(ROOT, warning.loc.filename)}:${warning.loc.line}): ${warning.message}`,
    );
  }
  const css = Buffer.from(code).toString("utf8");
  if (/@import\b/.test(css)) throw new Error(`build-dist: @import survived bundling ${files[0]}…`);
  return css;
};

// --- Emit ---

// Clear only the css this script owns — `vp pack` already put `zazz.js` here.
await mkdir(DIST, { recursive: true });
for (const name of await readdir(DIST)) {
  if (name.endsWith(".css")) await rm(path.join(DIST, name));
}
await rm(path.join(DIST, "primitives"), { recursive: true, force: true });
await mkdir(path.join(DIST, "primitives"));

const layers = await bundleFiles(DIST_CSS[DIST_LAYERS_CSS]);
const written = [];
for (const [file, sources] of Object.entries(DIST_CSS)) {
  const modular = file !== DIST_LAYERS_CSS && file !== DIST_BUNDLE_CSS;
  const css = modular ? layers + (await bundleFiles(sources)) : await bundleFiles(sources);
  await writeFile(path.join(DIST, file), css);
  written.push([file, Buffer.byteLength(css)]);
}

const width = Math.max(...written.map(([file]) => file.length));
for (const [file, bytes] of written) {
  console.log(`dist/${file.padEnd(width)}  ${bytes.toLocaleString("en-US").padStart(9)} B`);
}
console.log(`${written.length} css file(s) written`);
