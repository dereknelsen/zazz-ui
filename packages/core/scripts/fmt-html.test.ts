/**
 * @fileoverview `expandStyles()`: one style utility per line for any `style=""`
 * with two or more declarations, normalized to `name: value` so the kit's
 * attribute gates match. Runs before and after oxfmt, which keeps style values
 * verbatim for HTML (`embeddedLanguageFormatting: "off"`).
 */

import { describe, expect, it } from "vite-plus/test";
import { expandStyles } from "./fmt-html.ts";

describe("expandStyles", () => {
  it("puts each declaration of a multi-declaration style on its own line", () => {
    expect(expandStyles(`    <div style="--display: flex; --gap: 2">a</div>`)).toBe(
      `    <div style="\n        --display: flex;\n        --gap: 2;\n      ">a</div>`,
    );
  });

  it("indents from the attribute when the tag is already broken across lines", () => {
    expect(expandStyles(`<div\n  id="x"\n  style="--a: 1; --b: 2"\n>`)).toBe(
      `<div\n  id="x"\n  style="\n    --a: 1;\n    --b: 2;\n  "\n>`,
    );
  });

  it("keeps a single declaration on one line, without a trailing semicolon", () => {
    expect(expandStyles(`<p style="  --px:6 ;  ">a</p>`)).toBe(`<p style="--px: 6">a</p>`);
  });

  it("normalizes the colon spacing the attribute gates need", () => {
    expect(expandStyles(`<p style="--px:6;--py :  2">a</p>`)).toBe(
      `<p style="\n    --px: 6;\n    --py: 2;\n  ">a</p>`,
    );
  });

  it("does not split on semicolons inside parentheses or quotes", () => {
    expect(expandStyles(`<p style='--bg: url("a;b"); --content: ";"'>a</p>`)).toBe(
      `<p style='\n    --bg: url("a;b");\n    --content: ";";\n  '>a</p>`,
    );
  });

  it("re-expands an already expanded style to the same text", () => {
    const once = expandStyles(
      `  <div data-ui="card" style="--p: 4; --gap: var(--space-md)">x</div>`,
    );
    expect(expandStyles(once)).toBe(once);
  });

  it("leaves comments, scripts, and text that only looks like an attribute alone", () => {
    const html = `<!-- <a style="--a: 1; --b: 2"> --><script>el.setAttribute("style", "--a: 1; --b: 2")</script><code>style="--a: 1; --b: 2"</code>`;
    expect(expandStyles(html)).toBe(html);
  });
});
