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

function fakeKit(): ResolvedKit {
  return {
    version: "0.1.0",
    integrity: "",
    extractDir: "",
    manifest: {
      manifestVersion: 1,
      primitives: {},
      cssCascadeOrder: CASCADE,
      resolveClosure: (names) => names,
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
    expect(css).toContain(`/* @import "./your-legacy.css" layer(legacy); */`);
  });

  it("wires the legacy layer when a path is given", () => {
    const css = renderIndexCss({ kit: fakeKit(), legacy: "../styles/old.css", primitives: [] });
    expect(css).toContain(`@import "../styles/old.css" layer(legacy);`);
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

  it("uses .ts specifiers for ts projects", () => {
    const entry = renderIndexJs({ kit: fakeKit(), language: "ts" });
    expect(entry).toContain(`import "./base/utils.ts";`);
    const appended = appendJsImports(entry, ["primitives/tabs/tabs.js"], "ts");
    expect(appended).toContain(`import "./primitives/tabs/tabs.ts";`);
  });
});

describe("renderHead", () => {
  it("threads dir and head options into the kit's buildHead", () => {
    const config = {
      $schema: "",
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
