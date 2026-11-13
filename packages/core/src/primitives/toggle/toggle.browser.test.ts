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
    expect(style(at("[data-disabled]"), "opacity")).toBe("0.6");
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

  it("a kbd at an end of the visible content tightens that side, as on the button", () => {
    const root = mount(`<div>
      <button data-ui="button" data-button><span>Bold</span><kbd>B</kbd></button>
      <label data-ui="toggle" data-end><input type="checkbox" /><span>Bold</span><kbd>B</kbd></label>
      <label data-ui="toggle" data-start><input type="checkbox" /><kbd>B</kbd><span>Bold</span></label>
      <label data-ui="toggle" data-only><input type="checkbox" /><kbd>B</kbd></label>
      <label data-ui="toggle" data-plain><input type="checkbox" /><span>Bold</span></label>
    </div>`);
    const pad = (selector: string, side: "start" | "end") =>
      style(root.querySelector(selector)!, `padding-inline-${side}`);
    expect(pad("[data-end]", "end")).toBe(pad("[data-button]", "end"));
    expect(pad("[data-end]", "start")).toBe(pad("[data-plain]", "start"));
    expect(pad("[data-start]", "start")).toBe(pad("[data-button]", "end"));
    expect(pad("[data-start]", "end")).toBe(pad("[data-plain]", "end"));
    expect(pad("[data-end]", "end")).not.toBe(pad("[data-plain]", "end"));
    expect(pad("[data-only]", "start")).toBe(pad("[data-plain]", "start"));
    expect(pad("[data-only]", "end")).toBe(pad("[data-plain]", "end"));
    expect(style(root.querySelector("[data-plain]")!, "cursor")).toBe(
      style(root.querySelector("[data-button]")!, "cursor"),
    );
  });
});
