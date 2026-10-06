/**
 * @fileoverview Completions: utility names, tiers a utility takes, group and
 * pseudo forms, hooks in reach, values with resolved tokens, identities,
 * presets, and tag forms.
 */

import { describe, expect, it } from "vite-plus/test";
import { cursor, slice } from "../../test/cursor.ts";
import { complete } from "./completion.ts";

const labels = (marked: string) => {
  const { parsed, offset } = cursor(marked);
  return complete(parsed, offset).map((item) => item.label);
};

describe("style names", () => {
  it("offers utilities with their colon, ordered by the table", () => {
    const { parsed, offset, text } = cursor(`<p style="--p|">a</p>`);
    const items = complete(parsed, offset);
    const px = items.find((item) => item.label === "--px")!;
    expect(px).toMatchObject({ insertText: "--px: $0", snippet: true, retrigger: true });
    expect(slice(text, px.range)).toBe("--p");
    expect(px.detail).toContain("padding-inline");
    expect(items.map((item) => item.label)).toContain("--group-");
  });

  it("keeps the existing colon when renaming", () => {
    const { parsed, offset } = cursor(`<p style="--p|x: 4">a</p>`);
    expect(complete(parsed, offset).find((item) => item.label === "--px")!.insertText).toBe("--px");
  });

  it("offers only the tiers a utility takes after --x--", () => {
    expect(labels(`<p style="--px--|">a</p>`)).toEqual([
      "--px--sm",
      "--px--md",
      "--px--lg",
      "--px--xl",
      "--px--2xl",
    ]);
    const bg = labels(`<p style="--bg--|">a</p>`);
    expect(bg).toContain("--bg--hover");
    expect(bg).toContain("--bg--starting");
  });

  it("offers group utilities only with group states", () => {
    expect(labels(`<p style="--group-|">a</p>`)).toContain("--group-bg");
    expect(labels(`<p style="--group-|">a</p>`)).not.toContain("--group-px");
    const states = labels(`<p style="--group-opacity--|">a</p>`);
    expect(states).toContain("--group-opacity--hover");
    expect(states).not.toContain("--group-opacity--starting");
  });

  it("offers pseudo forms for pseudo utilities", () => {
    const before = labels(`<p style="--before-|">a</p>`);
    expect(before).toContain("--before-content");
    expect(before).toContain("--before-w");
    expect(before).toContain("--before-display");
    expect(before).not.toContain("--before-shadow");
  });

  it("offers hooks only for identities in reach", () => {
    expect(
      labels(`<div data-ui="card"><button data-ui="button" style="--|"></button></div>`),
    ).toEqual(expect.arrayContaining(["--ui-button-bg", "--ui-card-bg"].filter(Boolean)));
    expect(labels(`<p style="--|">a</p>`).some((label) => label.startsWith("--ui-"))).toBe(false);
  });
});

describe("style values", () => {
  it("offers tokens with their resolved values after the colon", () => {
    const { parsed, offset, text } = cursor(`<p style="--font-size: |">a</p>`);
    const items = complete(parsed, offset);
    const md = items.find((item) => item.label === "var(--font-size-lg)")!;
    expect(md.detail).toMatch(/rem – .*rem/);
    expect(slice(text, md.range)).toBe("");
  });

  it("replaces the value typed so far", () => {
    const { parsed, offset, text } = cursor(`<p style="--display: gr|; --p: 4">a</p>`);
    const grid = complete(parsed, offset).find((item) => item.label === "grid")!;
    expect(slice(text, grid.range)).toBe("gr");
  });

  it("offers colors with light and dark values", () => {
    const { parsed, offset } = cursor(`<p style="--bg: |">a</p>`);
    const primary = complete(parsed, offset).find((item) => item.label === "var(--color-primary)")!;
    expect(primary.detail).toMatch(/^light oklch.* · dark oklch/);
  });
});

describe("attributes and tags", () => {
  it("offers identities in data-ui, skipping ones already there", () => {
    const items = labels(`<div data-ui="card |"></div>`);
    expect(items).toContain("dialog");
    expect(items).not.toContain("card");
  });

  it("offers an identity's presets on its element, and slots under it", () => {
    expect(labels(`<button data-ui="button" |></button>`)).toContain("data-button-variant");
    expect(labels(`<div data-ui="dialog"><h2 |></h2></div>`)).toContain("data-dialog-slot");
    expect(labels(`<div data-ui="dialog"><h2 |></h2></div>`)).not.toContain("data-dialog-size");
  });

  it("offers preset values", () => {
    expect(labels(`<button data-ui="button" data-button-variant="|"></button>`)).toContain(
      "primary",
    );
  });

  it("offers ui-* tag forms", () => {
    expect(labels(`<ui-|`)).toContain("ui-carousel");
    expect(labels(`<di|v></div>`)).toEqual([]);
  });
});

describe("while typing", () => {
  it("completes inside a tag that is not closed yet", () => {
    expect(labels(`<p style="--p|`)).toContain("--px");
    expect(labels(`<p style="--bg: |`)).toContain("var(--color-primary)");
    expect(labels(`<div data-ui="|`)).toContain("card");
    expect(labels(`<button data-ui="button" |`)).toContain("data-button-variant");
  });

  it("still sees the ancestors of a tag being typed", () => {
    expect(labels(`<div data-ui="card">\n  <button data-ui="button" style="--|\n</div>`)).toEqual(
      expect.arrayContaining(["--ui-card-bg", "--ui-button-bg"]),
    );
  });
});
