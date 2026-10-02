"use strict";

/**
 * @fileoverview The meter: geometry rides the progress hooks, a
 * scale-number `--h` and a `--bg` utility apply, and the attribute-painted fill
 * still draws.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

describe("meter", () => {
  useKit();

  it("takes the track height from the progress family, or from a --h utility", () => {
    const root = mount(`<div>
      <meter data-ui="meter" data-default min="0" max="100" value="52"></meter>
      <meter data-ui="meter" data-utility min="0" max="100" value="52" style="--h: 3; --bg: rgb(1, 2, 3)"></meter>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "block-size"))).toBeCloseTo(
      lengthPx("var(--ui-progress-h)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "block-size"))).toBeCloseTo(scale(3), 1);
    expect(style(at("[data-utility]"), "background-color")).not.toBe(
      style(at("[data-default]"), "background-color"),
    );
  });

  it("paints the fill from the meter's attributes", () => {
    const el = mount(`<meter data-ui="meter" min="0" max="100" value="52"></meter>`);
    expect(style(el, "background-image")).toContain("linear-gradient");
  });
});
