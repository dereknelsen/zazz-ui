"use strict";

/**
 * @fileoverview Pure planning: manifest facts → the file lists to vendor.
 * @description Maps the kit's inventory to concrete `src/`-relative paths per
 * the recorded language (`.js` ships with its `.d.ts`; `--ts` swaps to the
 * TypeScript source). Manifest v1 exports no base inventory, so the v1 list
 * lives here, pinned to the manifest version the CLI declares support for;
 * newer kits that export `BASE_CSS`/`CORE_RUNTIME` take precedence.
 */

import type { KitManifest, PrimitiveEntry } from "./kit.ts";

/** The v1 base stylesheet inventory (kit `src/index.css` cascade shell). */
const V1_BASE_CSS = [
  "base/_layers.css",
  "base/_variables.css",
  "base/_reset.css",
  "base/_typography.css",
  "base/_view-transitions.css",
  "base/_utilities.css",
  "base/_layout.css",
];

/** The v1 core runtime — always vendored, never a per-primitive dependency. */
const V1_CORE_RUNTIME = [
  "base/utils.js",
  "base/signals.js",
  "base/zazz-element.js",
  "base/dialog-lifecycle.js",
];

export type Language = "js" | "ts";

export function baseCss(manifest: KitManifest): string[] {
  return manifest.baseCss ?? V1_BASE_CSS;
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
