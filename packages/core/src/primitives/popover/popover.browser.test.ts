"use strict";

/**
 * @fileoverview The popover: `data-popover-side` / `data-popover-align`
 * pick the anchor placement, and dual-mode `--p` applies to the surface.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, scale, style, useCss, useKit } from "../../../test/browser.ts";

describe("popover", () => {
  useKit();
  useCss(`[popover] { transition: none; }`);

  it("places the surface from data-popover-side and data-popover-align", () => {
    const root = mount(`<div>
      <div popover="manual" data-default>a</div>
      <div popover="manual" data-popover-side="top" data-popover-align="end" data-top-end>b</div>
      <div popover="manual" data-popover-side="right" data-right>c</div>
    </div>`);
    const area = (selector: string) => style(root.querySelector(selector)!, "position-area");
    /** The computed serialization of a position-area value, from a probe. */
    const computed = (value: string) => {
      const probe = document.createElement("div");
      probe.style.cssText = `position: fixed; position-area: ${value}`;
      document.body.append(probe);
      const result = style(probe, "position-area");
      probe.remove();
      return result;
    };
    expect(area("[data-default]")).toBe(computed("block-end inline-start"));
    expect(area("[data-top-end]")).toBe(computed("block-start span-inline-start"));
    expect(area("[data-right]")).toBe(computed("inline-end span-block-end"));
  });

  it("an open popover takes a scale-number --p utility over the padding hook", () => {
    const el = mount(`<div popover="manual" style="--p: 4">x</div>`) as HTMLElement;
    el.showPopover();
    expect(style(el, "display")).toBe("grid");
    expect(Number.parseFloat(style(el, "padding-inline-start"))).toBeCloseTo(scale(4), 1);
    el.hidePopover();
  });
});
