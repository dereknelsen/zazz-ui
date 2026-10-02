"use strict";

/**
 * @fileoverview The radio: `data-ui="radio"` sizes from the hook or a
 * dual-mode `--size` utility, fills when checked, and publishes its focus ring.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, tabTo, useCss, useKit } from "../../../test/browser.ts";

describe("radio", () => {
  useKit();
  useCss(`input { transition: none; }`);

  it("sizes from the hook or a --size utility and fills when checked", () => {
    const root = mount(`<div>
      <input type="radio" data-ui="radio" data-default />
      <input type="radio" data-ui="radio" data-utility style="--size: 8" />
      <input type="radio" data-ui="radio" data-checked checked />
      <div data-primary style="--bg: var(--color-primary)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "inline-size"))).toBeCloseTo(
      lengthPx("var(--ui-radio-size)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "inline-size"))).toBeCloseTo(scale(8), 1);
    expect(style(at("[data-checked]"), "background-color")).toBe(
      style(at("[data-primary]"), "background-color"),
    );
    expect(style(at("[data-checked]"), "background-image")).toContain("radial-gradient");
  });

  it("the focus ring survives a --shadow utility", async () => {
    const el = mount(
      `<input type="radio" data-ui="radio" style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)" />`,
    );
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
  });
});
