/**
 * @fileoverview Bundle: what the minifier does to dist/zazz.css. Lightning CSS
 * folds a block's animation longhands into the `animation` shorthand, timeline
 * included (parcel-bundler/lightningcss#1369), and browsers drop a shorthand
 * that names a timeline, whether `scroll()`, `view()`, or a named one
 * (`--ui-slider-thumb`). So the scroll-fade primitive keeps its timeline
 * longhands in a block of their own, and the slider writes no shorthand at all
 * (0.12.2 shipped one, and its fill never moved). This guards the output.
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

  it("never names a timeline inside the animation shorthand", () => {
    const shorthands = css.match(/(?<![a-z-])animation:[^;}]*/g) ?? [];
    const folded = shorthands.filter(
      // scroll() or view(), or a dashed ident standing as its own token (not a var()
      // argument, and not the tail of a name like `global-view-transition--old`)
      (declaration) => /\b(scroll|view)\(|(?<=[\s,:])--[\w-]+/.test(declaration),
    );
    expect(folded).toEqual([]);
  });

  it("keeps the slider's named timeline as a longhand", () => {
    expect(css).toMatch(/animation-timeline:--ui-slider-thumb/);
  });

  it("keeps the scroll-fade timeline as a longhand", () => {
    expect(css).toMatch(/animation-timeline:scroll\(self\),scroll\(self\)/);
    expect(css).toMatch(/animation-timeline:scroll\(self inline\),scroll\(self inline\)/);
  });
});
