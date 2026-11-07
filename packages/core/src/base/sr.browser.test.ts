"use strict";

/**
 * @fileoverview `--sr`: `only` hides an element visually and keeps it in the
 * accessibility tree, at the base or from a breakpoint up; `none` at a tier
 * hands the element back its own styles, utilities and primitive rules alike.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, scale, style, useKit } from "../../test/browser.ts";

const px = (value: string) => Number.parseFloat(value);

describe("--sr", () => {
  useKit();

  it("only clips the element to one pixel without hiding it", () => {
    const root = mount(`<div><span data-hidden style="--sr: only">Contact</span></div>`);
    const hidden = root.querySelector("[data-hidden]")!;
    expect(style(hidden, "position")).toBe("absolute");
    expect(style(hidden, "inline-size")).toBe("1px");
    expect(style(hidden, "overflow-x")).toBe("hidden");
    expect(style(hidden, "white-space")).toBe("nowrap");
    expect(style(hidden, "display")).not.toBe("none");
    expect(style(hidden, "visibility")).toBe("visible");
  });

  it("only beats a position utility on the same element", () => {
    const root = mount(`<span style="--position: relative; --sr: only">x</span>`);
    expect(style(root.firstElementChild ?? root, "position")).toBe("absolute");
  });

  it("none at the base changes nothing, and a tier turns only on from there", async () => {
    const root = mount(`<div><span data-el style="--sr: none; --sr--md: only">x</span></div>`);
    const el = root.querySelector("[data-el]")!;
    await atWidth(below("md"));
    expect(style(el, "position")).toBe("static");
    await atWidth(at("md"));
    expect(style(el, "position")).toBe("absolute");
  });

  it("none at a tier restores the element's own utilities", async () => {
    const root = mount(
      `<div><span data-el style="--sr: only; --sr--md: none; --p: 4; --position: relative; --display: block">x</span></div>`,
    );
    const el = root.querySelector("[data-el]")!;
    await atWidth(below("md"));
    expect(style(el, "position")).toBe("absolute");
    expect(px(style(el, "padding-top"))).toBe(0);
    await atWidth(at("md"));
    expect(style(el, "position")).toBe("relative");
    expect(px(style(el, "padding-top"))).toBeCloseTo(scale(4), 1);
    expect(px(style(el, "inline-size"))).toBeGreaterThan(1);
  });

  it("none at a tier restores a primitive's own styles", async () => {
    const root = mount(
      `<div><button data-ui="button" data-a>a</button><button data-ui="button" data-b style="--sr: only; --sr--md: none">b</button></div>`,
    );
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    await atWidth(at("md"));
    expect(style(b, "padding-left")).toBe(style(a, "padding-left"));
  });

  it("the highest active tier wins", async () => {
    const root = mount(
      `<div><span data-el style="--sr: only; --sr--md: none; --sr--lg: only">x</span></div>`,
    );
    const el = root.querySelector("[data-el]")!;
    await atWidth(at("md"));
    expect(style(el, "position")).toBe("static");
    await atWidth(at("lg"));
    expect(style(el, "position")).toBe("absolute");
  });
});
