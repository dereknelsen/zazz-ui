"use strict";

/**
 * @fileoverview The text input: field-family surface, a dual-mode
 * `--w` utility over the width hook, and the focus ring published to
 * `--_focus-ring` so it survives a `--shadow` utility.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, tabTo, useCss, useKit } from "../../../test/browser.ts";

describe("input", () => {
  useKit();
  useCss(`[data-ui~="input"] { transition: none; }`);

  it("takes the field height and a scale-number --w utility", () => {
    const root = mount(`<div>
      <input data-ui="input" data-default />
      <input data-ui="input" data-utility style="--w: 40" />
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "block-size"))).toBeCloseTo(
      lengthPx("var(--ui-field-h)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "inline-size"))).toBeCloseTo(scale(40), 1);
  });

  it("the focus ring survives a --shadow utility", async () => {
    const el = mount(`<input data-ui="input" style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)" />`);
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    expect(style(el, "box-shadow")).not.toContain(ring);
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
  });
});
