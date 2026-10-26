"use strict";

/**
 * @fileoverview Tests for the vendored file lists.
 */

import { describe, expect, it } from "vite-plus/test";
import type { KitManifest } from "./kit.ts";
import { baseFiles } from "./plan.ts";

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
