"use strict";

/**
 * @fileoverview Tests for the base stylesheet derivation: `parseBaseCss`
 * against the kit's real `src/index.css` (the CLI's supply chain for the
 * base list) and the fallback wiring in `baseCss`/`baseFiles`.
 */

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";
import type { KitManifest } from "./kit.ts";
import { baseCss, baseFiles, parseBaseCss } from "./plan.ts";

const KIT_INDEX_CSS = new URL("../../core/src/index.css", import.meta.url);

function manifest(baseCss?: KitManifest["baseCss"]): KitManifest {
  return {
    manifestVersion: 1,
    primitives: {},
    cssCascadeOrder: [],
    resolveClosure: (names) => names,
    ...(baseCss ? { baseCss } : {}),
  };
}

describe("parseBaseCss", () => {
  it("reads the workspace kit's index.css: properties after variables, families last", async () => {
    const lists = parseBaseCss(await readFile(KIT_INDEX_CSS, "utf8"));
    expect(lists).not.toBeNull();
    expect(lists?.pre).toEqual([
      "base/_layers.css",
      "base/_variables.css",
      "base/_properties.css",
      "base/_reset.css",
      "base/_typography.css",
      "base/_view-transitions.css",
    ]);
    expect(lists?.post).toEqual([
      "base/_utilities.css",
      "base/_layout.css",
      "base/_utilities-spacing.css",
      "base/_utilities-spacing-responsive.css",
      "base/_utilities-sizing.css",
      "base/_utilities-grid.css",
      "base/_utilities-flex.css",
      "base/_utilities-color.css",
      "base/_utilities-typography.css",
      "base/_utilities-position.css",
    ]);
  });

  it("reads a 0.4-shaped index.css into the seven-file split", () => {
    const css = `@import "./base/_layers.css";
@import "./base/_variables.css";
@import "./base/_reset.css";
@import "./base/_typography.css";
@import "./base/_view-transitions.css";
@import "./primitives/kbd/kbd.css";
@import "./base/_utilities.css";
@import "./base/_layout.css";
`;
    expect(parseBaseCss(css)).toEqual({
      pre: [
        "base/_layers.css",
        "base/_variables.css",
        "base/_reset.css",
        "base/_typography.css",
        "base/_view-transitions.css",
      ],
      post: ["base/_utilities.css", "base/_layout.css"],
    });
  });

  it("ignores commented-out imports and tolerates layer() suffixes", () => {
    const css = `/* @import "./base/_ghost.css"; */
@import "./base/_layers.css";
/* legacy slot
   @import "./base/_nope.css";
*/
@import "./primitives/kbd/kbd.css";
@import "./base/_utilities.css" layer(zazz);
`;
    expect(parseBaseCss(css)).toEqual({
      pre: ["base/_layers.css"],
      post: ["base/_utilities.css"],
    });
  });

  it("returns null for shapes it doesn't recognize", () => {
    expect(parseBaseCss("")).toBeNull();
    // No primitive imports: nothing to split around.
    expect(
      parseBaseCss(`@import "./base/_layers.css";\n@import "./base/_utilities.css";\n`),
    ).toBeNull();
    // Primitives but no trailing base block.
    expect(
      parseBaseCss(`@import "./base/_layers.css";\n@import "./primitives/kbd/kbd.css";\n`),
    ).toBeNull();
    // Only a trailing block.
    expect(
      parseBaseCss(`@import "./primitives/kbd/kbd.css";\n@import "./base/_utilities.css";\n`),
    ).toBeNull();
  });
});

describe("baseCss / baseFiles", () => {
  it("falls back to the pinned 0.4 list without derived lists", () => {
    const files = baseCss(manifest());
    expect(files).toHaveLength(7);
    expect(files[0]).toBe("base/_layers.css");
    expect(files.at(-1)).toBe("base/_layout.css");
    // 7 css + 4 runtime × (.js + .d.ts).
    expect(baseFiles(manifest(), "js")).toHaveLength(15);
    expect(baseFiles(manifest(), "ts")).toHaveLength(11);
  });

  it("flattens derived lists pre-then-post", () => {
    const derived = manifest({
      pre: ["base/_layers.css", "base/_properties.css"],
      post: ["base/_utilities.css", "base/_utilities-spacing.css"],
    });
    expect(baseCss(derived)).toEqual([
      "base/_layers.css",
      "base/_properties.css",
      "base/_utilities.css",
      "base/_utilities-spacing.css",
    ]);
    expect(baseFiles(derived, "ts")).toHaveLength(8);
  });
});
