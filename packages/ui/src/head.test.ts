"use strict";

/**
 * @fileoverview Tests for the head contract (`head.ts`) — structure of the
 * generated head and the invariant that CDN pins match the installed packages.
 */

import { createRequire } from "node:module";
import { describe, expect, it } from "vite-plus/test";
import { ESM_DEPENDENCIES, POLYFILLS, buildHead, cdnUrl } from "./head.ts";

const require = createRequire(import.meta.url);

describe("dependency manifest", () => {
  it("pins ESM dependency versions to the installed packages", () => {
    // Browsers load the pinned CDN file; tests and bundlers load node_modules.
    // These must be the same version or the two environments silently diverge.
    for (const dep of ESM_DEPENDENCIES) {
      const installed = require(`${dep.name}/package.json`) as { version: string };
      expect(`${dep.name}@${installed.version}`).toBe(`${dep.name}@${dep.version}`);
    }
  });

  it("serves every resource from the one CDN provider with SRI", () => {
    for (const dep of [...ESM_DEPENDENCIES, ...POLYFILLS]) {
      expect(cdnUrl(dep)).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\//);
      expect(dep.integrity).toMatch(/^sha384-[A-Za-z0-9+/]+={0,2}$/);
      // Static package files only — jsDelivr regenerates /+esm bundles, which
      // would invalidate the SRI hashes.
      expect(dep.file).not.toContain("+esm");
      expect(dep.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("buildHead", () => {
  it("renders the full default head in load order", () => {
    const head = buildHead();
    const order = [
      `<meta charset="utf-8">`,
      `<meta name="color-scheme" content="light dark">`,
      `display=swap`,
      `<link rel="stylesheet" href="./zazz/index.css">`,
      // The import map must precede every module load, including modulepreload.
      `<script type="importmap">`,
      `<link rel="modulepreload" href="./zazz/index.js">`,
      `popover-polyfill`,
      `<script type="module" src="./zazz/index.js"></script>`,
      `localStorage.getItem("theme")`,
    ];
    let cursor = -1;
    for (const marker of order) {
      const index = head.indexOf(marker);
      expect(index, `missing or out of order: ${marker}`).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it("maps every ESM dependency in the import map with integrity", () => {
    const head = buildHead();
    const match = head.match(/<script type="importmap">\n([\s\S]*?)\n<\/script>/);
    expect(match).not.toBeNull();
    const map = JSON.parse(match![1]) as {
      imports: Record<string, string>;
      integrity: Record<string, string>;
    };
    for (const dep of ESM_DEPENDENCIES) {
      expect(map.imports[dep.name]).toBe(cdnUrl(dep));
      expect(map.integrity[cdnUrl(dep)]).toBe(dep.integrity);
    }
  });

  it("substitutes the base into every kit URL", () => {
    const head = buildHead({ base: "/zazz/src" });
    expect(head).toContain(`href="/zazz/src/index.css"`);
    expect(head).toContain(`src="/zazz/src/index.js"`);
    expect(head).not.toContain(`"./zazz/`);
  });

  it("renders a style-only head with scripts: false", () => {
    const head = buildHead({ scripts: false });
    expect(head).toContain("index.css");
    expect(head).not.toContain("index.js");
    expect(head).not.toContain("importmap");
    expect(head).not.toContain("polyfill");
  });

  it("honors fontDisplay and theme switches", () => {
    const head = buildHead({ fontDisplay: "optional" });
    expect(head).toContain("display=optional");
    expect(buildHead({ fontDisplay: false })).not.toContain("fonts.googleapis.com");
    expect(buildHead({ theme: false })).not.toContain("localStorage");
  });

  it("never references another CDN provider", () => {
    const head = buildHead();
    expect(head).not.toMatch(/unpkg\.com|esm\.sh/);
  });
});
