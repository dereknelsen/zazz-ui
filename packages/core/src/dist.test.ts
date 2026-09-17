"use strict";

/**
 * @fileoverview Drift guard for the built `dist/` css against the distribution
 * map (`DIST_CSS` in `manifest.ts`): the files `scripts/build-dist.mjs` emits
 * are exactly the map's keys, every modular file opens with the cascade-layer
 * order, no `@import` survives bundling, and `zazz.css` holds the same rules
 * as the sum of its parts. Needs a built `dist/` (`vp run build`); the suite
 * skips itself, naming the first missing file, when any file the map lists
 * is absent (the root `ready` script builds before it tests).
 *
 * Reading the numbers: lightningcss minifies, and when it bundles the whole
 * of `index.css` it merges *adjacent blocks with an identical prelude* across
 * file boundaries. In this kit that is exactly the `@layer` wrappers (every
 * source file opens its own `@layer variables{}` / `@layer reset{}` /
 * `@layer zazz.components{}` / `@layer zazz.utilities{}` block, which end up
 * side by side) and the `:root` token blocks those wrappers contain. Every
 * other block — style rules, `@property`, `@media`, `@container`,
 * `@keyframes`, … — appears in `zazz.css` exactly as many times as in the
 * parts, so the `{` count is additive once `@layer` and `:root` openers are
 * set aside. That is the invariant asserted below.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { DIST_BUNDLE_CSS, DIST_CSS, DIST_LAYERS_CSS } from "./manifest.ts";

const SRC = dirname(fileURLToPath(import.meta.url));
const DIST = join(SRC, "..", "dist");

/** Files whose sources partition `zazz.css` (minus `_layers.css`), in its order. */
const PARTS = [
  "base.css",
  ...Object.keys(DIST_CSS).filter((file) => file.startsWith("primitives/")),
  "utilities.css",
];

/** Every file but the layer order and the bundle: prefixed with `layers.css` at build time. */
const MODULAR = Object.keys(DIST_CSS).filter(
  (file) => file !== DIST_LAYERS_CSS && file !== DIST_BUNDLE_CSS,
);

/** The top-level layer names, in order, from the `_layers.css` order statement. */
const LAYER_ORDER = (() => {
  const source = readFileSync(join(SRC, "base", "_layers.css"), "utf8");
  const statement = /^@layer\s+([^;{]+);/m.exec(source);
  if (!statement) throw new Error("_layers.css: no top-level @layer order statement");
  return statement[1].split(",").map((name) => name.trim());
})();

const cache = new Map<string, string>();
function read(file: string): string {
  let css = cache.get(file);
  if (css === undefined) {
    css = readFileSync(join(DIST, file), "utf8");
    cache.set(file, css);
  }
  return css;
}

function count(css: string, re: RegExp): number {
  return (css.match(re) ?? []).length;
}

/** Every block opener. */
const braces = (css: string): number => count(css, /{/g);
/** `@layer <names>{` block openers (not the `@layer a,b;` order statements). */
const layerBlocks = (css: string): number => count(css, /@layer[^;{]*{/g);
/** `:root{` openers — the token blocks lightningcss merges when adjacent. */
const rootBlocks = (css: string): number => count(css, /(?:^|[{};])\s*:root\s*{/g);
/** Block openers that survive concatenation one-for-one. */
const stableBlocks = (css: string): number => braces(css) - layerBlocks(css) - rootBlocks(css);

/**
 * Index of the first `@layer` statement or block that names the top-level
 * layer `name` (whole name only: `zazz.components{` does not mention `zazz`).
 */
function firstLayerMention(css: string, name: string): number {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.search(new RegExp(`(?<=@layer[^;{]*[\\s,])${escaped}(?=[\\s,;{]|$)`));
}

/** All `.css` files under `dist/`, as `dist/`-relative posix paths. */
function distCssFiles(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name),
    );
  return walk(DIST)
    .filter((file) => file.endsWith(".css"))
    .map((file) => relative(DIST, file).split("\\").join("/"));
}

// `vp pack` writes `dist/zazz.js` before `build-dist.mjs` runs, so `dist/`
// can exist half-built; only a dist/ holding every listed file is checked.
const missing = Object.keys(DIST_CSS).filter((file) => !existsSync(join(DIST, file)));
const built = missing.length === 0;
const describeDist = built ? describe : describe.skip;

describeDist(
  built
    ? "dist css"
    : `dist css (skipped: dist/${missing[0]} is absent — run \`vp run build\` first)`,
  () => {
    it("holds exactly the files DIST_CSS lists", () => {
      expect(distCssFiles().sort()).toEqual(Object.keys(DIST_CSS).sort());
    });

    it("has no empty file", () => {
      for (const file of Object.keys(DIST_CSS)) {
        expect(read(file).length, file).toBeGreaterThan(0);
      }
    });

    it("bundles every @import away", () => {
      for (const file of Object.keys(DIST_CSS)) {
        expect(read(file), file).not.toMatch(/@import\b/);
      }
    });

    it("opens layers.css with the @layer order, every top-level name in order", () => {
      const layers = read(DIST_LAYERS_CSS);
      // lightningcss folds the order statement and the two sublayer blocks into
      // one run of `@layer` statements — do not grep for the six-name line.
      expect(layers).toMatch(/^@layer\b/);
      expect(layers).not.toMatch(/[^;}]$/); // statements only, nothing dangling
      let cursor = -1;
      for (const name of LAYER_ORDER) {
        const index = firstLayerMention(layers, name);
        expect(index, `layers.css: ${name} missing or out of order`).toBeGreaterThan(cursor);
        cursor = index;
      }
      expect(rootBlocks(layers) + stableBlocks(layers), "layers.css holds only @layer").toBe(0);
    });

    it("prefixes every modular file with layers.css, verbatim", () => {
      const layers = read(DIST_LAYERS_CSS);
      for (const file of MODULAR) {
        expect(read(file).startsWith(layers), `${file} does not start with layers.css`).toBe(true);
      }
    });

    it("declares the top-level layers in order in zazz.css, before anything else", () => {
      // Here lightningcss drops `variables`/`reset` from the order statement
      // because their blocks open first; first mention still follows the order.
      const zazz = read(DIST_BUNDLE_CSS);
      expect(zazz).toMatch(/^@layer\b/);
      let cursor = -1;
      for (const name of LAYER_ORDER) {
        const index = firstLayerMention(zazz, name);
        expect(index, `zazz.css: ${name} missing or out of order`).toBeGreaterThan(cursor);
        cursor = index;
      }
    });

    it("partitions zazz.css's sources into base, primitives and utilities", () => {
      const [layers, ...rest] = DIST_CSS[DIST_BUNDLE_CSS] ?? [];
      expect(DIST_CSS[DIST_LAYERS_CSS]).toEqual([layers]);
      expect(PARTS.flatMap((file) => DIST_CSS[file] ?? [])).toEqual(rest);
    });

    it("holds the same rules in zazz.css as in the sum of its parts", () => {
      // See the file header: `{` is additive except for the `@layer` wrappers
      // and `:root` blocks lightningcss merges when they end up adjacent.
      const zazz = read(DIST_BUNDLE_CSS);
      const layers = read(DIST_LAYERS_CSS);
      const parts = PARTS.map((file) => read(file).slice(layers.length));
      const expected = parts.reduce((sum, css) => sum + stableBlocks(css), 0);
      expect(stableBlocks(zazz)).toBe(expected);

      // The merges only ever collapse blocks — never add or drop one.
      const partLayers = parts.reduce((sum, css) => sum + layerBlocks(css), 0);
      const partRoots = parts.reduce((sum, css) => sum + rootBlocks(css), 0);
      expect(layerBlocks(zazz)).toBeGreaterThan(0);
      expect(layerBlocks(zazz)).toBeLessThanOrEqual(partLayers + layerBlocks(layers));
      expect(rootBlocks(zazz)).toBeGreaterThan(0);
      expect(rootBlocks(zazz)).toBeLessThanOrEqual(partRoots);

      // Every `@layer` block name a part opens is opened in the bundle too.
      const names = (css: string): Set<string> =>
        new Set([...css.matchAll(/@layer\s*([^;{]*?)\s*{/g)].map((m) => m[1] ?? ""));
      const bundled = names(zazz);
      for (const css of parts) {
        for (const name of names(css)) {
          expect(bundled.has(name), `zazz.css lost @layer ${name}`).toBe(true);
        }
      }
    });

    it("keeps utilities.css the union of utilities-core and every family", () => {
      const layers = read(DIST_LAYERS_CSS);
      const union = Object.keys(DIST_CSS).filter(
        (file) => file.startsWith("utilities-") && file !== "utilities.css",
      );
      const parts = union.map((file) => read(file).slice(layers.length));
      const expected = parts.reduce((sum, css) => sum + stableBlocks(css), 0);
      expect(stableBlocks(read("utilities.css").slice(layers.length))).toBe(expected);
    });
  },
);
