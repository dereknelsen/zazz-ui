/**
 * @fileoverview Context, diagnostics, formatting, and hover over HTML fixtures.
 */

import { describe, expect, it } from "vite-plus/test";
import { parseHtml } from "../html/parse.ts";
import { cursor, slice } from "../../test/cursor.ts";
import { contextAt } from "./context.ts";
import { diagnose } from "./diagnostics.ts";
import { styleEdits } from "./format.ts";
import { hover } from "./hover.ts";

describe("context", () => {
  it("finds the declaration and side of the colon inside style", () => {
    const name = cursor(`<p style="--w: 4; --p|x: 2">a</p>`);
    const ctx = contextAt(name.parsed, name.offset);
    expect(ctx).toMatchObject({ kind: "style", part: "name", declaration: { name: "--px" } });
    const value = cursor(`<p style="--w: 4; --px: |2">a</p>`);
    expect(contextAt(value.parsed, value.offset)).toMatchObject({ kind: "style", part: "value" });
  });

  it("finds attribute values, attribute names, and tag names", () => {
    const value = cursor(`<div data-ui="card gr|oup"></div>`);
    expect(contextAt(value.parsed, value.offset)).toMatchObject({
      kind: "attribute-value",
      name: "data-ui",
    });
    const fresh = cursor(`<div data-ui="card" dat|></div>`);
    expect(contextAt(fresh.parsed, fresh.offset)).toMatchObject({
      kind: "attribute-name",
      prefix: "dat",
    });
    const tag = cursor(`<ui-car| data-x></ui-car>`);
    expect(contextAt(tag.parsed, tag.offset)).toMatchObject({ kind: "tag-name", prefix: "ui-car" });
  });

  it("is outside any tag in text content", () => {
    const text = cursor(`<p style="--w: 4">te|xt</p>`);
    expect(contextAt(text.parsed, text.offset)).toBeUndefined();
  });

  it("links parents, so identity checks see ancestors", () => {
    const parsed = parseHtml(`<div data-ui="dialog"><h2 data-dialog-size="sm"></h2></div>`);
    expect(diagnose(parsed)).toEqual([]);
  });
});

describe("diagnostics", () => {
  it("reports audit findings on the declaration, with the suggestion as a fix", () => {
    const text = `<div style="--grid-cols: 1fr 1fr; --foo: 1"></div>`;
    const found = diagnose(parseHtml(text));
    expect(found.map((d) => [d.rule, slice(text, d.range)])).toEqual([
      ["not-integer", "--grid-cols: 1fr 1fr"],
      ["unknown-utility", "--foo: 1"],
    ]);
    expect(found[0]!.fix).toMatchObject({ newText: "--template-cols: 1fr 1fr" });
  });

  it("checks data-ui-persist on whole pages", () => {
    const text = `<html><body><div data-ui-persist="cart"></div></body></html>`;
    expect(diagnose(parseHtml(text)).map((d) => [d.rule, slice(text, d.range)])).toEqual([
      ["persist", `data-ui-persist="cart"`],
    ]);
  });
});

describe("format", () => {
  it("rewrites each style in cascade order, one per line", () => {
    const text = `  <p style="--text: red; --display: flex">a</p>`;
    const [edit] = styleEdits(parseHtml(text));
    expect(edit!.newText).toBe(`\n      --display: flex;\n      --text: red;\n    `);
    expect(slice(text, edit!.range)).toBe("--text: red; --display: flex");
  });

  it("leaves a formatted style alone", () => {
    expect(styleEdits(parseHtml(`<p style="--px: 4">a</p>`))).toEqual([]);
  });
});

describe("hover", () => {
  it("describes a utility and its breakpoint tier", () => {
    const { parsed, offset, text } = cursor(`<p style="--p|x--md: 4">a</p>`);
    const result = hover(parsed, offset)!;
    expect(slice(text, result.range)).toBe("--px--md");
    expect(result.markdown).toContain("`padding-inline`");
    expect(result.markdown).toContain("65ch");
  });

  it("describes group and starting states", () => {
    const group = cursor(`<p style="--opacity: 1; --group-opa|city--hover: 0.5">a</p>`);
    expect(hover(group.parsed, group.offset)!.markdown).toMatch(/ancestor .*group.*:hover/);
    const starting = cursor(`<p style="--opacity--star|ting: 0">a</p>`);
    expect(hover(starting.parsed, starting.offset)!.markdown).toContain("@starting-style");
  });

  it("has nothing for unknown names", () => {
    const { parsed, offset } = cursor(`<p style="--fo|o: 1">a</p>`);
    expect(hover(parsed, offset)).toBeUndefined();
  });

  it("shows a token's resolved value and a shorthand's target", () => {
    const token = cursor(`<p style="--px: var(--spa|ce-md)">a</p>`);
    const result = hover(token.parsed, token.offset)!;
    expect(slice(token.text, result.range)).toBe("--space-md");
    expect(result.markdown).toMatch(/rem – .*rem/);
    const alias = cursor(`<p style="--shadow: m|d">a</p>`);
    expect(hover(alias.parsed, alias.offset)!.markdown).toContain("var(--shadow-md)");
  });

  it("shows a hook's default", () => {
    const { parsed, offset } = cursor(
      `<button data-ui="button" style="--ui-button-b|g: red"></button>`,
    );
    expect(hover(parsed, offset)!.markdown).toContain("var(--color-background)");
  });

  it("describes identities, tag forms, and presets", () => {
    const id = cursor(`<dialog data-ui="dia|log"></dialog>`);
    const markdown = hover(id.parsed, id.offset)!.markdown;
    expect(markdown).toContain("dialog primitive");
    expect(markdown).toContain("data-dialog-size");
    expect(markdown).toContain("Slots");
    const tag = cursor(`<ui-caro|usel></ui-carousel>`);
    expect(hover(tag.parsed, tag.offset)!.markdown).toContain("carousel");
    const preset = cursor(`<button data-ui="button" data-button-var|iant="ghost"></button>`);
    expect(hover(preset.parsed, preset.offset)!.markdown).toContain("`primary`");
  });
});
