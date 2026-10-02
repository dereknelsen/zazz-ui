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

  it("claim 15 (ratchet): the generated layer stays under 16 KB with Brotli", () => {
    const raw = Buffer.byteLength(all);
    const compressed = brotli(all);
    console.log(`utilities layer bytes: raw ${raw}, brotli ${compressed}`);
    // 13.2 KB at the 0.5 cut; 15.0 KB with the no-base allowlist and the border shorthand
    expect(compressed).toBeLessThan(16 * 1024);
  });
});
