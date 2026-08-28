// @ts-nocheck -- Node-only build script; the repo-root tsconfig used for loose
// files has no @types/node, so `node:*` imports can't type-check here.

/**
 * @fileoverview Generates `dist/sri.json`: sha384 SRI hashes for every
 * published css/js file (the `dist/` bundles and the readable `src/` tree).
 * @description The hashes are what lets every CDN snippet carry `integrity` —
 * the docs head-configurator and `buildHead`'s CDN mode read this file for a
 * pinned version and fill the attributes in (ticket 06). Runs after `vp pack`
 * in the build so the bundle hashes are of the exact published bytes; the file
 * ships inside the same tarball it describes and is also fetchable per version
 * from the CDN (`…@<x.y.z>/dist/sri.json`).
 *
 * Usage: part of `vp run build` (or `node scripts/generate-sri.mjs`).
 */

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Published script/style files only — types, maps, and tests are not runtime. */
const PUBLISHED = (name) =>
  (name.endsWith(".css") || name.endsWith(".js")) &&
  !name.endsWith(".d.ts") &&
  !name.endsWith(".test.js");

const files = [];
for (const dir of ["dist", "src"]) {
  const entries = await readdir(path.join(ROOT, dir), { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile() || !PUBLISHED(entry.name)) continue;
    files.push(
      path.relative(ROOT, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    );
  }
}

const sri = {};
for (const file of files.sort()) {
  const digest = createHash("sha384")
    .update(await readFile(path.join(ROOT, file)))
    .digest("base64");
  sri[file] = `sha384-${digest}`;
}

await writeFile(path.join(ROOT, "dist/sri.json"), `${JSON.stringify(sri, null, 2)}\n`);
console.log(`dist/sri.json: ${Object.keys(sri).length} files hashed`);
