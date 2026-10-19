/**
 * @fileoverview Bundle: what the minifier does to dist/zazz.css. Lightning CSS
 * folds a block's animation longhands into the `animation` shorthand, timeline
 * included (parcel-bundler/lightningcss#1369), and browsers drop a shorthand
 * that names a `scroll()` or `view()` timeline, so the scroll-fade primitive
 * keeps its timeline longhands in a block of their own. This guards the output.
 * It reads the bundle `vp run core#build` writes, so `ready` runs it after the
 * build; on its own without a dist it skips, loudly.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const BUNDLE = join(dirname(fileURLToPath(import.meta.url)), "../dist/zazz.css");
const built = existsSync(BUNDLE);
if (!built)
  console.warn(`[zazz] ${BUNDLE} is missing; bundle tests skipped. Run vp run core#build.`);

describe.skipIf(!built)("dist/zazz.css", () => {
  const css = readFileSync(BUNDLE, "utf8");

  it("never names a scroll-driven timeline inside the animation shorthand", () => {
    const shorthands = css.match(/(?<![a-z-])animation:[^;}]*/g) ?? [];
    const folded = shorthands.filter((declaration) => /\b(scroll|view)\(/.test(declaration));
    expect(folded).toEqual([]);
  });

  it("keeps the scroll-fade timeline as a longhand", () => {
    expect(css).toMatch(/animation-timeline:scroll\(self\),scroll\(self\)/);
    expect(css).toMatch(/animation-timeline:scroll\(self inline\),scroll\(self inline\)/);
  });
});
