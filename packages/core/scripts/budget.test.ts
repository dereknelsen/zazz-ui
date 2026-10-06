/**
 * @fileoverview Budget: the generated utilities layer's selector inventory and
 * its Brotli size. The numbers print so the changelog can quote them. The
 * Brotli assertion is a ratchet so the layer cannot quietly grow.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants } from "node:zlib";
import { describe, expect, it } from "vite-plus/test";
import { BASE_CSS_POST, BASE_CSS_PRE } from "../src/manifest.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");
const GENERATED = [...BASE_CSS_PRE, ...BASE_CSS_POST].filter((path) =>
  /^base\/_(breakpoints|properties|utilities-)/.test(path),
);

function read(path: string): string {
  return readFileSync(join(SRC, path), "utf8");
}

function brotli(text: string): number {
  return brotliCompressSync(Buffer.from(text), {
    params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY },
  }).length;
}

describe("utilities layer budget", () => {
  const files = GENERATED.map((path) => [path, read(path)] as const);
  const all = files.map(([, css]) => css).join("\n");

  it("claim 14: reports the [style*=] selector inventory", () => {
    const rules = [...all.matchAll(/([^{}]+)\{/g)]
      .map((m) => m[1]!)
      .filter((p) => !p.trim().startsWith("@"));
    const gated = rules.filter((prelude) => prelude.includes("[style*=")).length;
    const substrings = (all.match(/\[style\*=/g) ?? []).length;
    const registrations = (all.match(/@property /g) ?? []).length;
    console.log(
      `utilities layer: ${files.length} files, ${rules.length} rules, ${gated} gated on [style*=], ${substrings} [style*=] substrings, ${registrations} @property registrations`,
    );
    expect(gated).toBeGreaterThan(0);
  });

  it("claim 16 (ratchet): the layer stays under 1,350 [style*=] substrings", () => {
    // Style recalc cost is the substring count, not the byte count: every
    // [style*=] rule is tested on every element with a style attribute, and each
    // test scans the whole attribute (Blink's rolling-hash find, ~0.3 µs per
    // 100 characters). Measured 2026-10-06 in Chromium, 2,300 elements with
    // 190-character style attributes: 1,322 substrings cost 1.56 s of initial
    // style; emptying every rule body changed nothing; the registrations cost
    // nothing. A per-utility setter design (one rule per utility per tier,
    // 2,177 substrings) measured +68 % while saving 6.3 KB, so bytes are never
    // bought with substrings. 1,307 after the stuck setter rewrite; 1,141 without
    // the per-side border longhands, gradient tiers, and the rarely used keywords.
    const substrings = (all.match(/\[style\*=/g) ?? []).length;
    expect(substrings).toBeLessThanOrEqual(1350);
  });

  it("claim 15 (ratchet): the generated layer stays under 20 KB with Brotli", () => {
    const raw = Buffer.byteLength(all);
    const compressed = brotli(all);
    console.log(`utilities layer bytes: raw ${raw}, brotli ${compressed}`);
    // 13.2 KB at the 0.5 cut; 15.0 KB with the no-base allowlist and the border shorthand;
    // 15.8 KB with per-tier keyword rules and grid placement; 16.7 KB with gradients;
    // 17.1 KB with primitive-only no-base exclusions; 18.4 KB with the stuck state; 17.6 KB with five ch breakpoints; 18.7 KB with shadow and weight keywords and display shorthands; 19.4 KB with breakpoint tiers on color;
    // 19.2 KB after the size audit (short generated comments, the stuck setter without ancestor gates);
    // 16.7 KB without the per-side border longhands, tier-less gradients, and keyword rules only on --w --h --min-w --max-w and subgrid.
    // Floor: the 2,848 distinct custom property names alone compress to 5.3 KB, and every
    // registration or setter line is ~2 B of Brotli beyond its name; see CHANGELOG 0.5.0 "Budget".
    expect(compressed).toBeLessThan(20 * 1024);
  });
});
