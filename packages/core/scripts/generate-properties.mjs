// @ts-nocheck -- Node-only build script; the repo-root tsconfig used for loose
// files has no @types/node, so `node:*` imports can't type-check here.

/**
 * @fileoverview Regenerates `src/base/_properties.css` from the style prop
 * registry.
 * @description `src/props.ts` is the single source of truth for the style
 * props (ADR-0012); this script renders its `propertiesCss()` into the
 * committed file so the `@property` registrations can never drift from the
 * registry. The file is written only when its content changes, and
 * `src/props.test.ts` fails when the committed file and the registry disagree.
 *
 * Reads the compiled `src/props.js`, so emit first: `tsc -p tsconfig.json`.
 *
 * Usage: `vp run properties` (or `node scripts/generate-properties.mjs`).
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../src/base/_properties.css", import.meta.url));

let propertiesCss;
try {
  ({ propertiesCss } = await import("../src/props.js"));
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") {
    throw new Error("src/props.js is missing — run `tsc -p tsconfig.json` first", {
      cause: error,
    });
  }
  throw error;
}

const next = propertiesCss();
const current = await readFile(OUT, "utf8").catch(() => null);

if (current === next) {
  console.log("_properties.css is up to date");
} else {
  await writeFile(OUT, next);
  const count = (next.match(/^@property /gm) ?? []).length;
  console.log(`wrote src/base/_properties.css (${count} registrations)`);
}
