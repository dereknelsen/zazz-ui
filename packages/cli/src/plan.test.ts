"use strict";

/**
 * @fileoverview Tests for the vendored file lists.
 */

import { describe, expect, it } from "vite-plus/test";
import type { KitManifest } from "./kit.ts";
import { baseFiles, primitiveFiles } from "./plan.ts";

const manifest: KitManifest = {
  manifestVersion: 1,
  primitives: {},
  cssCascadeOrder: [],
  resolveClosure: (names) => names,
};

describe("baseFiles", () => {
  it("vendors the ambient globals.d.ts with the TypeScript sources", () => {
    expect(baseFiles(manifest, "ts")).toContain("globals.d.ts");
  });

  it("leaves globals.d.ts out of a JavaScript vendor (the emitted .d.ts files cover it)", () => {
    expect(baseFiles(manifest, "js")).not.toContain("globals.d.ts");
  });
});

describe("data files", () => {
  const entry = {
    css: ["primitives/card/card.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/card/card.html"],
  };

  it("vendors a primitive's data file with it, examples or not", () => {
    const withData = { ...entry, data: "primitives/card/card.json" };
    expect(primitiveFiles(withData, "js", { examples: false })).toEqual([
      "primitives/card/card.css",
      "primitives/card/card.json",
    ]);
    expect(primitiveFiles(withData, "js", { examples: true })).toContain(
      "primitives/card/card.json",
    );
  });

  it("vendors none from a kit that predates them", () => {
    expect(primitiveFiles(entry, "js", { examples: false })).toEqual(["primitives/card/card.css"]);
    expect(baseFiles(manifest, "js").filter((file) => file.endsWith(".json"))).toEqual([]);
  });

  it("vendors the definitions' data files with the base", () => {
    const withData = { ...manifest, baseData: ["primitives/example/example.json"] };
    expect(baseFiles(withData, "js")).toContain("primitives/example/example.json");
  });
});
