"use strict";

/**
 * @fileoverview The switch: the track takes its width from the hook
 * or a dual-mode `--w` utility, fills when checked, and publishes its focus ring.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, tabTo, useCss, useKit } from "../../../test/browser.ts";

describe("switch", () => {
  useKit();
  useCss(`input, label::after { transition: none; }`);

  it("sizes the track from the hook or a --w utility and fills when checked", () => {
    const root = mount(`<div>
      <label><input type="checkbox" role="switch" data-default /></label>
      <label><input type="checkbox" role="switch" data-utility style="--w: 12" /></label>
      <label><input type="checkbox" role="switch" data-checked checked /></label>
      <div data-primary style="--bg: var(--color-primary)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "inline-size"))).toBeCloseTo(
      lengthPx("var(--ui-switch-track-w)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "inline-size"))).toBeCloseTo(scale(12), 1);
    expect(style(at("[data-checked]"), "background-color")).toBe(
      style(at("[data-primary]"), "background-color"),
    );
  });

  it("the focus ring survives a --shadow utility", async () => {
    const root = mount(
      `<label><input type="checkbox" role="switch" style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)" /></label>`,
    );
    const el = root.querySelector("input")!;
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
  });
});
