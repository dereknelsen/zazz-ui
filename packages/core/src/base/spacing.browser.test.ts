"use strict";

/**
 * @fileoverview Spacing and margin utilities: dual mode on padding and gap, a gap
 * tier with no base (allowlisted), and margin's `auto` keyword.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, scale, style, useKit } from "../../test/browser.ts";

const px = (value: string) => Number.parseFloat(value);

describe("spacing and margin", () => {
  useKit();

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
});
