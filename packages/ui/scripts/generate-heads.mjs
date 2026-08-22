// @ts-nocheck -- Node-only build script; the repo-root tsconfig used for loose
// files has no @types/node, so `node:*` imports can't type-check here.

/**
 * @fileoverview Regenerates the shared `<head>` block in every `examples/*.html`.
 * @description The block between `<!-- zazz:head -->` and `<!-- /zazz:head -->`
 * markers is owned by the head contract (`src/head.ts`) — this script renders
 * `buildHead({ base: "../src" })` into each file so the example pages can never
 * drift from the canonical head. Page-specific tags (`<title>`, prefetch
 * hints) live outside the markers and are left untouched.
 *
 * Oxfmt owns final formatting (self-closing voids, attribute wrapping), so the
 * script ends with a `vp fmt` pass over any file it rewrote — the committed
 * state is always generated-then-formatted, and `vp check` stays clean.
 *
 * Usage: `vp run heads` (or `node scripts/generate-heads.mjs`).
 */

import { spawnSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHead } from "../src/head.ts";

const EXAMPLES_DIR = fileURLToPath(new URL("../examples", import.meta.url));
const START = "<!-- zazz:head -->";
const END = "<!-- /zazz:head -->";

const head = buildHead({ base: "../src" });

/**
 * Formatting-insensitive comparison — oxfmt rewraps attributes and self-closes
 * void elements, and those differences don't make a head block out of date.
 * @param {string} html
 */
const normalize = (html) =>
  html
    .replace(/\s+/g, " ")
    .replace(/\s*\/>/g, ">")
    .replace(/\s+>/g, ">")
    .trim();

const names = (await readdir(EXAMPLES_DIR)).filter((name) => name.endsWith(".html")).sort();
const updated = [];

for (const name of names) {
  const file = path.join(EXAMPLES_DIR, name);
  const html = await readFile(file, "utf8");

  const startIndex = html.indexOf(START);
  const endIndex = html.indexOf(END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`${name}: missing ${START} … ${END} markers`);
  }

  // Already current (modulo formatting)? Leave the file untouched.
  const current = html.slice(startIndex + START.length, endIndex);
  if (normalize(current) === normalize(head)) continue;

  // Re-indent the generated block to the marker's own indentation.
  const indent = /(?:^|\n)([ \t]*)$/.exec(html.slice(0, startIndex))?.[1] ?? "";
  const block = head
    .split("\n")
    .map((line) => (line ? indent + line : line))
    .join("\n");

  const next =
    html.slice(0, startIndex + START.length) + "\n" + block + "\n" + indent + html.slice(endIndex);

  updated.push(name);
  await writeFile(file, next);
  console.log(`updated ${name}`);
}

if (updated.length > 0) {
  const fmt = spawnSync("vp", ["fmt", "examples", "--write"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: "inherit",
  });
  if (fmt.status !== 0) process.exit(fmt.status ?? 1);
}

console.log(`${updated.length} file(s) updated`);
