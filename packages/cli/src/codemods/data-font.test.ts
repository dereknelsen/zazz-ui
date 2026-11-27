"use strict";

/**
 * @fileoverview The `data-font` codemod's source transform: `text-*` tokens
 * leave `data-ui` for `data-font`, `text-link` becomes the `link` identity,
 * selectors follow, and what it cannot rewrite is listed for review.
 */

import { describe, expect, it } from "vite-plus/test";
import { primitivesUsed, rewriteDataFont } from "./data-font.ts";

const out = (source: string) => rewriteDataFont(source).output;

describe("rewriteDataFont", () => {
  it("moves a lone role to data-font and drops the empty data-ui", () => {
    expect(out(`<p data-ui="text-sm">a</p>`)).toBe(`<p data-font="sm">a</p>`);
    expect(out(`<h2 data-ui="text-h4" id="x">a</h2>`)).toBe(`<h2 data-font="h4" id="x">a</h2>`);
    expect(out(`<span data-ui="text-eyebrow">a</span>`)).toBe(`<span data-font="eyebrow">a</span>`);
  });

  it("keeps the identities that shared the attribute", () => {
    expect(out(`<span data-ui="badge text-xs">a</span>`)).toBe(
      `<span data-ui="badge" data-font="xs">a</span>`,
    );
    expect(out(`<div data-ui="text-lg card group">a</div>`)).toBe(
      `<div data-ui="card group" data-font="lg">a</div>`,
    );
  });

  it("turns text-link into the link identity", () => {
    expect(out(`<a data-ui="text-link" href="#">a</a>`)).toBe(`<a data-ui="link" href="#">a</a>`);
    expect(out(`<a data-ui="text-sm text-link">a</a>`)).toBe(
      `<a data-ui="link" data-font="sm">a</a>`,
    );
  });

  it("keeps the author's quotes, escaped ones included", () => {
    expect(out(`<p data-ui='text-sm'>a</p>`)).toBe(`<p data-font='sm'>a</p>`);
    expect(out(`const html = "<p data-ui=\\"badge text-xs\\">a</p>";`)).toBe(
      `const html = "<p data-ui=\\"badge\\" data-font=\\"xs\\">a</p>";`,
    );
  });

  it("rewrites every element, across lines", () => {
    const { output, count } = rewriteDataFont(
      `<p\n  data-ui="text-sm"\n>a</p>\n<p data-ui="text-xs">b</p>\n<p data-ui="card">c</p>`,
    );
    expect(output).toBe(
      `<p\n  data-font="sm"\n>a</p>\n<p data-font="xs">b</p>\n<p data-ui="card">c</p>`,
    );
    expect(count).toBe(2);
  });

  it("rewrites selectors in stylesheets and scripts", () => {
    expect(out(`:where([data-ui~="text-eyebrow"]) { color: red }`)).toBe(
      `:where([data-font="eyebrow"]) { color: red }`,
    );
    expect(out(`document.querySelector('[data-ui~="text-link"]')`)).toBe(
      `document.querySelector('[data-ui~="link"]')`,
    );
    expect(out(`[data-ui="text-sm"], [data-ui~='text-h2'] {}`)).toBe(
      `[data-font="sm"], [data-font='h2'] {}`,
    );
  });

  it("leaves other text-* words alone", () => {
    const source = `<p data-ui="text-muted card" class="text-sm">a</p><p style="--text-align: center">b</p>`;
    expect(rewriteDataFont(source)).toEqual({ output: source, count: 0, review: [] });
  });

  it("lists what needs a hand: two roles, and roles set from script", () => {
    const source = [
      `<p data-ui="text-sm text-lg">a</p>`,
      `el.setAttribute("data-ui", "text-xs");`,
      `<p data-ui={big ? "text-lg" : "text-sm"}>b</p>`,
      `<p data-ui="text-md">c</p>`,
    ].join("\n");
    const { output, count, review } = rewriteDataFont(source);
    expect(count).toBe(1);
    expect(output.split("\n")[3]).toBe(`<p data-font="md">c</p>`);
    expect(review.map((item) => item.line)).toEqual([1, 2, 3]);
    expect(review[1]!.text).toBe(`el.setAttribute("data-ui", "text-xs");`);
  });

  it("leaves a value with template syntax untouched, and lists it", () => {
    for (const source of [
      `<p data-ui="text-sm {{ a }} {{ b }}">a</p>`,
      `<p data-ui="<%= a %> <%= b %> text-sm">a</p>`,
      `<p data-ui="card {% if small %} text-sm {% endif %}">a</p>`,
      `<p data-ui="text-sm \${extra}">a</p>`,
    ]) {
      const result = rewriteDataFont(source);
      expect(result.output, source).toBe(source);
      expect(result.review, source).toHaveLength(1);
    }
  });

  it("leaves an unquoted selector for review: it may sit inside a quoted string", () => {
    const source = `document.querySelector("[data-ui~=text-sm]")`;
    expect(rewriteDataFont(source)).toMatchObject({ output: source, count: 0 });
    expect(rewriteDataFont(source).review).toHaveLength(1);
  });

  it("does not add a second data-font to an element that has one", () => {
    const source = `<p data-ui="text-sm" data-font="lg">a</p>`;
    expect(rewriteDataFont(source)).toMatchObject({ output: source, count: 0 });
    expect(rewriteDataFont(source).review).toHaveLength(1);
    // the neighbor's data-font is not this element's
    expect(out(`<p data-font="lg">a</p><p data-ui="text-sm">b</p>`)).toBe(
      `<p data-font="lg">a</p><p data-font="sm">b</p>`,
    );
  });

  it("only reads an attribute named data-ui", () => {
    for (const source of [
      `<p my-data-ui="card text-sm">a</p>`,
      `<p x-data-ui="text-sm">a</p>`,
      `<p :data-ui="text-sm">a</p>`,
      `<p v-bind:data-ui="text-sm">a</p>`,
      `<p data-uid="text-sm">a</p>`,
    ]) {
      expect(out(source), source).toBe(source);
    }
    expect(primitivesUsed(`<p x-data-ui="link">a</p>`)).toEqual([]);
  });

  it("lists roles it cannot reach across lines and through script", () => {
    const lines = (source: string) => rewriteDataFont(source).review.map((item) => item.line);
    expect(lines(`<p data-ui="card\n  text-sm text-lg">a</p>`)).toEqual([1]);
    expect(lines(`<p\n  data-ui={clsx(\n    "card",\n    "text-sm",\n  )}\n>a</p>`)).toEqual([2]);
    expect(lines(`el.dataset.ui = "text-sm";`)).toEqual([1]);
    expect(lines(`<p :data-ui="'text-sm'">a</p>`)).toEqual([1]);
  });

  it("does not list prose that only mentions a token", () => {
    for (const source of [
      `<p data-ui="card">text-sm is retired</p>`,
      `// data-ui tokens such as text-sm are retired`,
      `<p data-ui-tooltip="see text-sm">a</p>`,
    ]) {
      expect(rewriteDataFont(source).review, source).toEqual([]);
    }
  });

  it("is idempotent", () => {
    const once = out(`<a data-ui="badge text-sm text-link">a</a>`);
    expect(out(once)).toBe(once);
  });
});

describe("primitivesUsed", () => {
  it("names the primitives the rewritten markup needs", () => {
    expect(primitivesUsed(`<p data-font="sm">a</p>`)).toEqual(["font"]);
    expect(
      primitivesUsed(
        `<a data-ui="link" data-font="sm">a</a><article data-ui="card prose"></article>`,
      ),
    ).toEqual(["font", "link", "prose"]);
    expect(primitivesUsed(`<a data-ui="button" data-button-variant="link">a</a>`)).toEqual([]);
  });
});
