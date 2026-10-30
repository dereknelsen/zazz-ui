"use strict";

/**
 * @fileoverview Spacing and margin utilities: dual mode on padding and gap, a gap
 * tier with no base (allowlisted), margin's `auto` keyword, and `auto` on the side
 * insets.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, lengthPx, mount, scale, style, useKit } from "../../test/browser.ts";

const px = (value: string) => Number.parseFloat(value);

describe("spacing and margin", () => {
  useKit();
  afterEach(() => document.documentElement.removeAttribute("style"));

  it("--spacing runs from --spacing-min to --spacing-max across the fluid range", async () => {
    await atWidth(400);
    expect(lengthPx("var(--spacing)")).toBeCloseTo(16 * 0.225, 1);
    await atWidth(1280);
    expect(lengthPx("var(--spacing)")).toBeCloseTo(16 * 0.25, 1);
    document.documentElement.style.setProperty("--spacing-max", "0.5rem");
    expect(lengthPx("var(--spacing)")).toBeCloseTo(8, 1);
  });

  it("--p and --px take scale numbers and lengths", () => {
    const root = mount(
      `<div><div data-a style="--p: 4"></div><div data-b style="--px: 2rem; --pt: 1"></div></div>`,
    );
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    expect(px(style(a, "padding-inline-start"))).toBeCloseTo(scale(4), 1);
    expect(px(style(a, "padding-block-end"))).toBeCloseTo(scale(4), 1);
    expect(px(style(b, "padding-inline-start"))).toBe(32);
    expect(px(style(b, "padding-block-start"))).toBeCloseTo(scale(1), 1);
  });

  it("--gap--md: 4 alone on a grid is zero below md and 4 steps above", async () => {
    const el = mount(`<div style="--display: grid; --gap--md: 4"><i></i><i></i></div>`);
    await atWidth(below("md"));
    expect(px(style(el, "row-gap"))).toBe(0);
    await atWidth(at("md"));
    expect(px(style(el, "row-gap"))).toBeCloseTo(scale(4), 1);
  });

  it("--mx: auto centers a sized block, and --m: 2 is a scale margin", async () => {
    await atWidth(at("md"));
    const root = mount(
      `<div style="inline-size: 500px"><div data-c style="inline-size: 100px; --mx: auto"></div><div data-m style="--m: 2"></div></div>`,
    );
    const c = root.querySelector("[data-c]")!;
    const m = root.querySelector("[data-m]")!;
    expect(c.getBoundingClientRect().left - root.getBoundingClientRect().left).toBe(200);
    expect(px(style(m, "margin-inline-start"))).toBeCloseTo(scale(2), 1);
  });

  it("--top and --bottom take auto, and a breakpoint tier releases a side", async () => {
    const el = mount(
      `<div style="--position: sticky; --top: auto; --bottom: 0; --bottom--md: auto; --top--md: 4">x</div>`,
    );
    await atWidth(below("md"));
    expect(style(el, "inset-block-start")).toBe("auto");
    expect(style(el, "inset-block-end")).toBe("0px");
    await atWidth(at("md"));
    expect(style(el, "inset-block-end")).toBe("auto");
    expect(px(style(el, "inset-block-start"))).toBeCloseTo(scale(4), 1);
  });

  it("--left and --right take auto too", async () => {
    // sticky, as above: an absolute element reports an auto inset as its used length
    const el = mount(
      `<div style="--position: sticky; --left: 0; --left--md: auto; --right: auto; --right--md: 2">x</div>`,
    );
    await atWidth(below("md"));
    expect(style(el, "inset-inline-start")).toBe("0px");
    expect(style(el, "inset-inline-end")).toBe("auto");
    await atWidth(at("md"));
    expect(style(el, "inset-inline-start")).toBe("auto");
    expect(px(style(el, "inset-inline-end"))).toBeCloseTo(scale(2), 1);
  });
});
