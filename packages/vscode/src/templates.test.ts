/**
 * @fileoverview Page templates: a head block listing the page's primitives
 * (so auto-imports work), valid snippet text, and the swap page's opt-ins.
 */

import { findHeadBlock } from "@zazz-ui/core/head.ts";
import { describe, expect, it } from "vite-plus/test";
import { fragmentSnippet, isPrimitiveName, pageSnippet, templatePrimitives } from "./templates.ts";

/** Snippet text as the inserted document reads (placeholders → defaults, escapes undone). */
function render(snippet: string): string {
  return snippet
    .replace(/\$\{\d+:([^}]*)\}/g, "$1")
    .replace(/\$\d+/g, "")
    .replace(/\\([\\$}])/g, "$1");
}

describe("templates", () => {
  it("writes a page whose head block lists its primitives", () => {
    const page = render(pageSnippet({ base: "./zazz", primitives: templatePrimitives("blank") }));
    expect(findHeadBlock(page)?.options).toEqual({ base: "./zazz", primitives: ["layout"] });
    expect(page).toContain('href="./zazz/primitives/layout/layout.css"');
    expect(page).toContain('<main data-ui="layout">');
    expect(page).toContain("<title>Page</title>");
  });

  it("wraps a primitive's example and loads it", () => {
    const page = render(
      pageSnippet({
        base: "../src",
        primitives: templatePrimitives("primitive", "dialog"),
        body: '<button commandfor="$1"></button><dialog data-ui="dialog" id="${1:d}"></dialog>',
      }),
    );
    expect(findHeadBlock(page)?.options.primitives).toEqual(["dialog", "layout"]);
    expect(page).toContain(
      '    <main data-ui="layout">\n      <button commandfor=""></button><dialog data-ui="dialog" id="d"></dialog>',
    );
  });

  it("renumbers a body's tab stops past the page's own", () => {
    const snippet = pageSnippet({
      base: ".",
      primitives: ["dialog"],
      body: 'id="${1:d}" for="$1" \\$5',
    });
    expect(snippet).toContain('id="${3:d}" for="$3" \\$5');
    expect(snippet).toContain("${1:Page}");
  });

  it("opts the swap page into in-page navigation with persisted parts", () => {
    const page = render(
      pageSnippet({ base: "./zazz", primitives: templatePrimitives("swap"), swap: true }),
    );
    expect(page).toContain('<html lang="en" data-ui-navigation="swap">');
    expect(page).toContain('data-ui-persist="header"');
    expect(page).toContain('<ui-toaster data-ui-persist="toaster">');
  });

  it("starts a fragment on its identity, and checks names", () => {
    expect(fragmentSnippet("chip")).toBe('<div data-ui="chip">\n  $0\n</div>\n');
    expect(isPrimitiveName("chip-group")).toBe(true);
    expect(isPrimitiveName("Chip")).toBe(false);
  });
});
