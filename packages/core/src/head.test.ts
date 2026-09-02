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

describe("buildHead cdn mode", () => {
  const KIT = "https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.3.0";

  it("rejects anything but an exact version", () => {
    expect(() => buildHead({ cdn: { version: "latest" } })).toThrow(/exact version/);
    expect(() => buildHead({ cdn: { version: "0.1" } })).toThrow(/exact version/);
    expect(() => buildHead({ cdn: { version: "^0.1.0" } })).toThrow(/exact version/);
    expect(() => buildHead({ cdn: { version: "0.3.0" } })).not.toThrow();
    expect(() => buildHead({ cdn: { version: "1.2.3-beta.1" } })).not.toThrow();
  });

  it("renders the bundle grain: two pinned dist requests", () => {
    const head = buildHead({ cdn: { version: "0.3.0" } });
    expect(head).toContain(`<link rel="stylesheet" href="${KIT}/dist/zazz.css">`);
    expect(head).toContain(`<script type="module" src="${KIT}/dist/zazz.js"></script>`);
    expect(head).toContain(`<link rel="modulepreload" href="${KIT}/dist/zazz.js">`);
    // The bundle keeps bare imports, so the import map still ships.
    expect(head).toContain(`<script type="importmap">`);
    expect(head).not.toContain(`/src/`);
  });

  it("fills integrity + crossorigin from sri", () => {
    const sri = {
      "dist/zazz.css": "sha384-css",
      "dist/zazz.js": "sha384-js",
    };
    const head = buildHead({ cdn: { version: "0.3.0", sri } });
    expect(head).toContain(
      `href="${KIT}/dist/zazz.css" integrity="sha384-css" crossorigin="anonymous"`,
    );
    expect(head).toContain(
      `src="${KIT}/dist/zazz.js" integrity="sha384-js" crossorigin="anonymous"`,
    );
  });

  it("renders the granular grain from the dependency closure in cascade order", () => {
    const head = buildHead({ cdn: { version: "0.3.0", primitives: ["combobox"] } });
    // Base layers first (layer declaration leads), utilities/layout last.
    const order = [
      `${KIT}/src/base/_layers.css`,
      `${KIT}/src/base/_view-transitions.css`,
      // combobox closure css, cascade order: fields (shared token owner first),
      // badge, kbd, button, popover, select... combobox.
      `${KIT}/src/primitives/fields/fields.css`,
      `${KIT}/src/primitives/badge/badge.css`,
      `${KIT}/src/primitives/kbd/kbd.css`,
      `${KIT}/src/primitives/button/button.css`,
      `${KIT}/src/primitives/popover/popover.css`,
      `${KIT}/src/primitives/select/select.css`,
      `${KIT}/src/primitives/combobox/combobox.css`,
      `${KIT}/src/base/_utilities.css`,
      `${KIT}/src/base/_layout.css`,
      // Behavior: side-effect tags for the engine stack and the primitive.
      `${KIT}/src/base/dialog-lifecycle.js`,
      `${KIT}/src/base/typeahead.js`,
      `${KIT}/src/primitives/combobox/combobox.js`,
    ];
    let cursor = -1;
    for (const marker of order) {
      const index = head.indexOf(marker);
      expect(index, `missing or out of order: ${marker}`).toBeGreaterThan(cursor);
      cursor = index;
    }
    expect(head).not.toContain("dist/zazz");
  });

  it("keeps polyfills for css-only closures and covers core imports via the import map", () => {
    const sri = {
      "src/base/zazz-element.js": "sha384-ze",
      "src/base/dialog-lifecycle.js": "sha384-dl",
    };
    const head = buildHead({ cdn: { version: "0.3.0", primitives: ["tooltip"], sri } });
    // tooltip's closure is css-only, but its styles ride the Popover API.
    expect(head).toContain("popover-polyfill");
    expect(head).toContain(
      `src="${KIT}/src/base/dialog-lifecycle.js" integrity="sha384-dl" crossorigin="anonymous"`,
    );
    // Transitively imported core modules are covered by import-map integrity.
    const match = head.match(/<script type="importmap">\n([\s\S]*?)\n<\/script>/);
    const map = JSON.parse(match![1]) as { integrity: Record<string, string> };
    expect(map.integrity[`${KIT}/src/base/zazz-element.js`]).toBe("sha384-ze");
  });

  it("mirrors index.css's base imports around the primitives", () => {
    const head = buildHead({ cdn: { version: "0.3.0", primitives: ["button"] } });
    const links = [...head.matchAll(/src\/base\/(_[a-z-]+\.css)/g)].map((m) => m[1]);
    expect(links).toEqual([
      "_layers.css",
      "_variables.css",
      "_reset.css",
      "_typography.css",
      "_view-transitions.css",
      "_utilities.css",
      "_layout.css",
    ]);
  });
});
