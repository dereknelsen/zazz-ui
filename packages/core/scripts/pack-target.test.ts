/**
 * @fileoverview The bundled build (`dist/zazz.js`, the CDN file) and tsc's
 * per-file output must target the same ECMAScript version. When the bundle
 * was left at esnext it shipped the toaster's `using` declaration verbatim;
 * stable Safari cannot parse it, so none of the kit's JavaScript ran there
 * (reveal content stayed hidden, dialogs lost their backdrop fallback) while
 * the tsc output, which lowers it, worked in development.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("bundle target", () => {
  it("packs to the same ECMAScript target tsc compiles to", () => {
    const tsconfig = readFileSync(join(ROOT, "tsconfig.json"), "utf8");
    const config = readFileSync(join(ROOT, "vite.config.ts"), "utf8");
    const tscTarget = /"target":\s*"([^"]+)"/.exec(tsconfig)?.[1]?.toLowerCase();
    const packTarget = /pack:\s*\{[\s\S]*?\btarget:\s*"([^"]+)"/.exec(config)?.[1]?.toLowerCase();
    expect(tscTarget).toBeDefined();
    expect(packTarget).toBe(tscTarget);
  });
});
