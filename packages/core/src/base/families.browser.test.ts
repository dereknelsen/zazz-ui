"use strict";

/**
 * @fileoverview One browser check per new emission shape across the flow,
 * grid, sizing, typography, and box families.
 */

import { describe, expect, it } from "vite-plus/test";
import { atWidth, mount, scale, style, useKit } from "../../test/browser.ts";

const px = (value: string) => Number.parseFloat(value);
const tracks = (el: Element) => style(el, "grid-template-columns").trim().split(/\s+/).length;

describe("families", () => {
  useKit();

  it("--size sets both dimensions", () => {
    const el = mount(`<div style="--size: 4"></div>`);
    expect(px(style(el, "inline-size"))).toBeCloseTo(scale(4), 1);
    expect(px(style(el, "block-size"))).toBeCloseTo(scale(4), 1);
  });

  it("a number on a sizing utility does nothing on an element that uses a sizing keyword", async () => {
    await atWidth(800);
    const el = mount(`<div style="--w: fit-content; --h: 4">x</div>`);
    expect(style(el, "block-size")).not.toBe(`${scale(4)}px`);
  });

  it("--grid-fit packs as many columns as fit the minimum", async () => {
    await atWidth(800);
    const el = mount(
      `<div style="inline-size: 500px; --display: grid; --grid-fit: 12rem"><i></i><i></i><i></i><i></i></div>`,
    );
    expect(tracks(el)).toBe(2);
  });

  it("--line-clamp clamps and --text sizes", () => {
    const el = mount(`<p style="--line-clamp: 2; --font-size: 20px">lorem</p>`);
    expect(style(el, "-webkit-line-clamp")).toBe("2");
    expect(style(el, "overflow")).toBe("hidden");
    expect(style(el, "font-size")).toBe("20px");
  });

  it("--text-align--md: center alone is start below md (no-base allowlist)", async () => {
    const el = mount(`<p style="--text-align--md: center">x</p>`);
    await atWidth(700);
    expect(style(el, "text-align")).toBe("start");
    await atWidth(800);
    expect(style(el, "text-align")).toBe("center");
  });

  it("--rounded, --position, and --flex-direction are plain utilities", () => {
    const el = mount(
      `<div style="--rounded: 8px; --position: relative; --display: flex; --flex-direction: column"></div>`,
    );
    expect(style(el, "border-radius")).toBe("8px");
    expect(style(el, "position")).toBe("relative");
    expect(style(el, "flex-direction")).toBe("column");
  });
});
