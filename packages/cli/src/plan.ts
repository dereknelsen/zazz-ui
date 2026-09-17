"use strict";

/**
 * @fileoverview Pure planning: manifest facts → the file lists to vendor.
 * @description Maps the kit's inventory to concrete `src/`-relative paths per
 * the recorded language (`.js` ships with its `.d.ts`; `--ts` swaps to the
 * TypeScript source). The base stylesheet list is derived from the kit's own
 * `src/index.css` (`parseBaseCss`, run by the kit engine at load time), so a
 * kit that adds base files — 0.5's `_properties.css` and the style-prop
 * family files — vendors correctly without a per-version table here. Kits
 * without a recognizable `index.css` fall back to the 0.4 list pinned below.
 * Manifest v1 exports no core-runtime inventory either; newer kits that
 * export `CORE_RUNTIME` take precedence over the v1 list.
 */

import type { BaseCssLists, KitManifest, PrimitiveEntry } from "./kit.ts";

/**
 * The 0.4 base stylesheet inventory (kit `src/index.css` cascade shell):
 * `pre` loads before the primitives, `post` after them. The fallback for a
 * kit whose `src/index.css` is missing or unrecognized.
 */
const V1_BASE_CSS: BaseCssLists = {
  pre: [
    "base/_layers.css",
    "base/_variables.css",
    "base/_reset.css",
    "base/_typography.css",
    "base/_view-transitions.css",
  ],
  post: ["base/_utilities.css", "base/_layout.css"],
};

/** The v1 core runtime — always vendored, never a per-primitive dependency. */
const V1_CORE_RUNTIME = [
  "base/utils.js",
  "base/signals.js",
  "base/zazz-element.js",
  "base/dialog-lifecycle.js",
];

export type Language = "js" | "ts";

/** A live `@import "./base/_x.css"` line (any trailing `layer(...)` allowed). */
const BASE_IMPORT = /^@import\s+"\.\/(base\/_[\w-]+\.css)"/;
const PRIMITIVE_IMPORT = /^@import\s+"\.\/primitives\//;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

/**
 * @description Reads the base stylesheet lists out of a kit's `src/index.css`:
 * every live `@import "./base/_*.css"` line, in file order, split into the
 * ones before the first primitive import (`pre`) and the ones after (`post`).
 * Commented-out imports (the legacy/vendors slots) are ignored. Returns null
 * when the file has no primitive imports or no base imports on either side —
 * an unrecognized shape the caller should fall back from.
 */
export function parseBaseCss(indexCss: string): BaseCssLists | null {
  const pre: string[] = [];
  const post: string[] = [];
  let afterPrimitives = false;
  for (const raw of indexCss.replace(BLOCK_COMMENT, "").split("\n")) {
    const line = raw.trim();
    if (PRIMITIVE_IMPORT.test(line)) {
      afterPrimitives = true;
      continue;
    }
    const file = BASE_IMPORT.exec(line)?.[1];
    if (file === undefined) continue;
    (afterPrimitives ? post : pre).push(file);
  }
  if (!afterPrimitives || pre.length === 0 || post.length === 0) return null;
  return { pre, post };
}

/** The base stylesheets around the primitive imports, in cascade order. */
export function baseCssLists(manifest: KitManifest): BaseCssLists {
  return manifest.baseCss ?? V1_BASE_CSS;
}

export function baseCss(manifest: KitManifest): string[] {
  const { pre, post } = baseCssLists(manifest);
  return [...pre, ...post];
}

export function coreRuntime(manifest: KitManifest): string[] {
  return manifest.coreRuntime ?? V1_CORE_RUNTIME;
}

/** Maps an emitted `.js` path to what the language actually vendors. */
export function scriptVariants(jsPath: string, language: Language): string[] {
  if (language === "ts") return [jsPath.replace(/\.js$/, ".ts")];
  return [jsPath, jsPath.replace(/\.js$/, ".d.ts")];
}

/** Everything `init` vendors: base css + core runtime per language. */
export function baseFiles(manifest: KitManifest, language: Language): string[] {
  return [
    ...baseCss(manifest),
    ...coreRuntime(manifest).flatMap((jsPath) => scriptVariants(jsPath, language)),
  ];
}

/** Everything `add` vendors for one primitive (dependencies resolved by the caller). */
export function primitiveFiles(
  entry: PrimitiveEntry,
  language: Language,
  options: { examples: boolean },
): string[] {
  return [
    ...entry.css,
    ...entry.js.flatMap((jsPath) => scriptVariants(jsPath, language)),
    ...(options.examples ? entry.examples : []),
  ];
}

/** Base scripts a set of primitives requires (per language), deduped in order. */
export function baseScriptFiles(entries: PrimitiveEntry[], language: Language): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const entry of entries) {
    for (const jsPath of entry.base) {
      if (seen.has(jsPath)) continue;
      seen.add(jsPath);
      files.push(...scriptVariants(jsPath, language));
    }
  }
  return files;
}
