/**
 * @fileoverview The selector matcher over html-eslint tags: the grammar of the
 * selectors the generator derives from the kit's stylesheets, and nothing more.
 */

import { describe, expect, it } from "vite-plus/test";
import lintData from "@zazz-ui/core/editor/zazz.lint-data.json" with { type: "json" };
import { parseHtml } from "./parse.ts";
import { compileSelector, matches } from "./matches.ts";

/** The first tag named `name` in `html`. */
function tagIn(html: string, name: string) {
  const tag = parseHtml(html).tags.find((tag) => tag.name.toLowerCase() === name);
  if (!tag) throw new Error(`no <${name}> in ${html}`);
  return tag;
}

describe("matches", () => {
  it("matches a type, the universal selector, and attribute presence, equality, and word", () => {
    const tag = tagIn(`<input role="combobox" data-ui="input wide" required>`, "input");
    expect(matches(tag, "input")).toBe(true);
    expect(matches(tag, "INPUT")).toBe(true);
    expect(matches(tag, "*")).toBe(true);
    expect(matches(tag, "[required]")).toBe(true);
    expect(matches(tag, '[role="combobox"]')).toBe(true);
    expect(matches(tag, 'input[role="combobox"]')).toBe(true);
    expect(matches(tag, '[role="combo"]')).toBe(false);
    expect(matches(tag, '[data-ui~="wide"]')).toBe(true);
    expect(matches(tag, '[data-ui~="wid"]')).toBe(false);
    expect(matches(tag, "button")).toBe(false);
  });

  it("matches a selector list and :is()", () => {
    const tag = tagIn(`<button interestfor="t"></button>`, "button");
    expect(matches(tag, "code, button")).toBe(true);
    expect(matches(tag, ":is([popovertarget], [interestfor])")).toBe(true);
    expect(matches(tag, ":is([popovertarget], [command])")).toBe(false);
  });

  it("matches the child and descendant combinators against ancestors", () => {
    const html = `<div data-ui="menu"><span><button popovertarget="m"></button></span></div>`;
    const button = tagIn(html, "button");
    expect(matches(button, '[data-ui~="menu"] button')).toBe(true);
    expect(matches(button, '[data-ui~="menu"] > button')).toBe(false);
    expect(matches(button, ':is(ui-menu, [data-ui~="menu"]) span > :is([popovertarget])')).toBe(
      true,
    );
  });

  it("keeps a > inside a quoted value, and ~= never matches an empty or spaced word", () => {
    const tag = tagIn(`<p title="a>b" data-x="" data-y="a b"></p>`, "p");
    expect(matches(tag, '[title="a>b"]')).toBe(true);
    expect(matches(tag, '[data-x~=""]')).toBe(false);
    expect(matches(tag, '[data-y~="a b"]')).toBe(false);
  });

  it("matches :not(), a relative :has(), and the sibling combinators", () => {
    const html = `<div><label data-l><i></i><input role="switch"></label><input type="radio" data-r><b></b><s></s></div>`;
    const label = tagIn(html, "label");
    expect(matches(label, 'label:has(> input[role="switch"])')).toBe(true);
    expect(matches(label, "label:has(> b)")).toBe(false);
    expect(matches(label, "label:has(i + input)")).toBe(true);
    expect(matches(label, "label:not([data-l])")).toBe(false);
    expect(matches(label, "label:not([data-x], b)")).toBe(true);
    const s = tagIn(html, "s");
    expect(matches(s, "b + s")).toBe(true);
    expect(matches(s, "input + s")).toBe(false);
    expect(matches(s, 'input[type="radio"] ~ s')).toBe(true);
    expect(matches(tagIn(html, "b"), 'input[type="radio"] + b')).toBe(true);
  });

  it("matches the substring and prefix attribute operators", () => {
    const tag = tagIn(`<p style="--shadow-angle: 90deg" lang="en-US"></p>`, "p");
    expect(matches(tag, '[style*="--shadow-angle"]')).toBe(true);
    expect(matches(tag, '[style^="--shadow"]')).toBe(true);
    expect(matches(tag, '[style$="deg"]')).toBe(true);
    expect(matches(tag, '[lang|="en"]')).toBe(true);
    expect(matches(tag, '[style*=""]')).toBe(false);
  });

  it("throws on syntax outside its grammar", () => {
    expect(() => compileSelector("a:hover")).toThrow(/unsupported/);
    expect(() => compileSelector("a::before")).toThrow(/unsupported/);
  });

  it("compiles every selector the generator derives from the primitives", () => {
    for (const selector of lintData.selectors) {
      expect(() => compileSelector(selector), selector).not.toThrow();
    }
  });
});
