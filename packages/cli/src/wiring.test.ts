"use strict";

/**
 * @fileoverview Tests for entry-file rendering and surgical insertion.
 */

import { describe, expect, it } from "vite-plus/test";
import type { ResolvedKit } from "./kit.ts";
import {
  appendJsImports,
  insertCssImports,
  renderHead,
  renderIndexCss,
  renderIndexJs,
} from "./wiring.ts";

const CASCADE = ["kbd", "button", "popover", "fields", "input", "select", "combobox"];

function fakeKit(manifest: Partial<ResolvedKit["manifest"]> = {}): ResolvedKit {
  return {
    version: "0.1.0",
    integrity: "",
    extractDir: "",
    manifest: {
      manifestVersion: 1,
      primitives: {},
      cssCascadeOrder: CASCADE,
      resolveClosure: (names) => names,
      ...manifest,
    },
    buildHead: (options) =>
      `<meta charset="utf-8"><!-- base=${String(options.base)} fonts=${String(
        options.fontDisplay,
      )} theme=${String(options.theme)} -->`,
    readFile: async () => Buffer.from(""),
    has: () => true,
  };
}

describe("renderIndexCss", () => {
  it("mirrors the kit anatomy: layers first, utilities and layout last", () => {
    const css = renderIndexCss({ kit: fakeKit(), legacy: null, primitives: [] });
    const order = [
      `@import "./base/_layers.css";`,
      `@import "./base/_view-transitions.css";`,
      "Zazz primitives",
      `@import "./base/_utilities.css";`,
      `@import "./base/_layout.css";`,
    ];
    let cursor = -1;
    for (const marker of order) {
      const index = css.indexOf(marker);
      expect(index, marker).toBeGreaterThan(cursor);
      cursor = index;
    }
    expect(css).toContain(`/* @import "./your-legacy.css" layer(legacy.imports); */`);
  });

  it("wires the legacy layer when a path is given", () => {
    const css = renderIndexCss({ kit: fakeKit(), legacy: "../styles/old.css", primitives: [] });
    // a sublayer, never bare `legacy` (an implicit final sublayer would outrank migrations)
    expect(css).toContain(`@import "../styles/old.css" layer(legacy.imports);`);
    expect(css).not.toMatch(/layer\(legacy\)/);
    expect(css).not.toContain("your-legacy.css");
  });
});

describe("insertCssImports", () => {
  const fresh = renderIndexCss({ kit: fakeKit(), legacy: null, primitives: [] });

  it("inserts at the marker in a fresh entry, in cascade order", () => {
    const result = insertCssImports(
      fresh,
      [
        { name: "button", css: ["primitives/button/button.css"] },
        { name: "kbd", css: ["primitives/kbd/kbd.css"] },
      ],
      CASCADE,
    );
    const kbd = result.indexOf("primitives/kbd/kbd.css");
    const button = result.indexOf("primitives/button/button.css");
    const utilities = result.indexOf("base/_utilities.css");
    expect(kbd).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(kbd);
    expect(utilities).toBeGreaterThan(button);
  });

  it("slots a new primitive between existing ones by cascade position", () => {
    const withTwo = insertCssImports(
      fresh,
      [
        { name: "kbd", css: ["primitives/kbd/kbd.css"] },
        { name: "select", css: ["primitives/select/select.css"] },
      ],
      CASCADE,
    );
    const result = insertCssImports(
      withTwo,
      [{ name: "button", css: ["primitives/button/button.css"] }],
      CASCADE,
    );
    const kbd = result.indexOf("primitives/kbd/");
    const button = result.indexOf("primitives/button/");
    const select = result.indexOf("primitives/select/");
    expect(button).toBeGreaterThan(kbd);
    expect(select).toBeGreaterThan(button);
  });

  it("is idempotent and survives a user-stripped file", () => {
    const userFile = `@import "./base/_layers.css";\n@import "./primitives/kbd/kbd.css";\n@import "./base/_utilities.css";\n`;
    const once = insertCssImports(
      userFile,
      [
        { name: "kbd", css: ["primitives/kbd/kbd.css"] },
        { name: "button", css: ["primitives/button/button.css"] },
      ],
      CASCADE,
    );
    expect(once.match(/primitives\/kbd\//g)).toHaveLength(1);
    const button = once.indexOf("primitives/button/");
    expect(button).toBeGreaterThan(once.indexOf("primitives/kbd/"));
    expect(button).toBeLessThan(once.indexOf("base/_utilities.css"));
    expect(
      insertCssImports(once, [{ name: "button", css: ["primitives/button/button.css"] }], CASCADE),
    ).toBe(once);
  });

  it("skips markup-only primitives (no css)", () => {
    expect(insertCssImports(fresh, [{ name: "card", css: [] }], CASCADE)).toBe(fresh);
  });
});

describe("appendJsImports", () => {
  it("appends missing imports per language and stays idempotent", () => {
    const entry = renderIndexJs({ kit: fakeKit(), language: "js" });
    const once = appendJsImports(
      entry,
      ["base/typeahead.js", "primitives/combobox/combobox.js"],
      "js",
    );
    expect(once).toContain(`import "./base/typeahead.js";`);
    expect(once.indexOf("typeahead")).toBeLessThan(once.indexOf("combobox"));
    expect(appendJsImports(once, ["primitives/combobox/combobox.js"], "js")).toBe(once);
  });

  it("inserts after a user's multi-line import, not inside it", () => {
    const entry = `import "./base/utils.js";\nimport {\n  setup,\n} from "./app.js";\nsetup();\n`;
    expect(appendJsImports(entry, ["primitives/tabs/tabs.js"], "js")).toBe(
      `import "./base/utils.js";\nimport {\n  setup,\n} from "./app.js";\nimport "./primitives/tabs/tabs.js";\nsetup();\n`,
    );
  });

  it("uses .ts specifiers for ts projects", () => {
    const entry = renderIndexJs({ kit: fakeKit(), language: "ts" });
    expect(entry).toContain(`import "./base/utils.ts";`);
    const appended = appendJsImports(entry, ["primitives/tabs/tabs.js"], "ts");
    expect(appended).toContain(`import "./primitives/tabs/tabs.ts";`);
  });
});

describe("renderIndexJs", () => {
  const v2 = fakeKit({
    manifestVersion: 2,
    coreRuntime: ["base/utils.js", "base/navigation.js"],
    corePolyfills: [{ file: "base/scroll-state.js", supports: ["container-type", "scroll-state"] }],
  });

  it("imports the runtime and gates each polyfill on CSS.supports, as the kit's index.ts does", () => {
    const js = renderIndexJs({ kit: v2, language: "js" });
    expect(js).toContain(`import "./base/navigation.js";`);
    expect(js).toContain(
      `if (typeof CSS !== "undefined" && !CSS.supports("container-type", "scroll-state")) {\n  void import("./base/scroll-state.js");\n}`,
    );
    expect(js).not.toContain(`import "./base/scroll-state.js";`);
    expect(renderIndexJs({ kit: v2, language: "ts" })).toContain(
      `void import("./base/scroll-state.ts");`,
    );
  });

  it("keeps appended imports with the other imports, above the polyfill gates", () => {
    const js = appendJsImports(
      renderIndexJs({ kit: v2, language: "js" }),
      ["primitives/tabs/tabs.js"],
      "js",
    );
    expect(js.indexOf(`import "./primitives/tabs/tabs.js";`)).toBeGreaterThan(
      js.indexOf(`import "./base/navigation.js";`),
    );
    expect(js.indexOf(`import "./primitives/tabs/tabs.js";`)).toBeLessThan(js.indexOf("if ("));
  });

  it("renders no gate for a kit that exports no polyfills (manifest v1)", () => {
    expect(renderIndexJs({ kit: fakeKit(), language: "js" })).not.toContain("CSS.supports");
  });
});

describe("renderHead", () => {
  it("threads dir and head options into the kit's buildHead", () => {
    const config = {
      kit: { version: "0.1.0", integrity: "" },
      dir: "zazz",
      language: "js" as const,
      legacy: null,
      head: { fonts: false, themeScript: true },
      base: { files: {} },
      primitives: {},
    };
    const head = renderHead(fakeKit(), config);
    expect(head).toContain("base=./zazz");
    expect(head).toContain("fonts=false");
    expect(head).toContain("theme=true");
    expect(head).toContain("generated by zazz-ui");
  });
});
