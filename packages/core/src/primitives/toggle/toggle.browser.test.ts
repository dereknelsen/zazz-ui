"use strict";

/**
 * @fileoverview The toggle: the checked look comes from the nested
 * input through `:has()`, a disabled input dims the label, and a dual-mode
 * `--px` utility applies to the label.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, scale, style, useCss, useKit } from "../../../test/browser.ts";

const background = (el: Element) => style(el, "background-color");

describe("toggle", () => {
  useKit();
  useCss(`[data-ui~="toggle"] { transition: none; }`);

  it("a checked input gives the label the primary look; a disabled input dims it", () => {
    const root = mount(`<div>
      <button data-ui="button" data-button-variant="primary" data-primary>p</button>
      <label data-ui="toggle" data-off><input type="checkbox" /><span>Bold</span></label>
      <label data-ui="toggle" data-on><input type="checkbox" checked /><span>Bold</span></label>
      <label data-ui="toggle" data-disabled><input type="checkbox" disabled /><span>Bold</span></label>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(background(at("[data-on]"))).toBe(background(at("[data-primary]")));
    expect(background(at("[data-off]"))).not.toBe(background(at("[data-on]")));
    expect(style(at("[data-disabled]"), "opacity")).toBe("0.5");
    expect(style(at("[data-off]"), "opacity")).toBe("1");
  });

  it("a --px utility and the sm size both set the padding, utility first", () => {
    const root = mount(`<div>
      <label data-ui="toggle" data-utility style="--px: 4"><input type="checkbox" /><span>a</span></label>
      <label data-ui="toggle" data-sm data-toggle-size="sm"><input type="checkbox" /><span>b</span></label>
      <label data-ui="toggle" data-both data-toggle-size="sm" style="--px: 4"><input type="checkbox" /><span>c</span></label>
    </div>`);
    const px = (selector: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, "padding-inline-start"));
    expect(px("[data-utility]")).toBeCloseTo(scale(4), 1);
    expect(px("[data-both]")).toBeCloseTo(scale(4), 1);
    expect(px("[data-sm]")).not.toBeCloseTo(scale(4), 1);
  });
});
