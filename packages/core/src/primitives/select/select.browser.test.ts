"use strict";

/**
 * @fileoverview The select: field-family surface with a dual-mode
 * `--w` utility, `data-select-side` feeding the picker placement, and the
 * multiselect's stamped trigger and icon in attribute form.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useCss, useKit } from "../../../test/browser.ts";

describe("select", () => {
  useKit();
  useCss(`[data-ui~="select"] { transition: none; }`);

  it("takes the field height, a scale-number --w utility, and a side preset", () => {
    const root = mount(`<div>
      <select data-ui="select" data-default><option>a</option></select>
      <select data-ui="select" data-utility style="--w: 40"><option>a</option></select>
      <select data-ui="select" data-top data-select-side="top"><option>a</option></select>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "block-size"))).toBeCloseTo(
      lengthPx("var(--ui-field-h)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "inline-size"))).toBeCloseTo(scale(40), 1);
    expect(style(at("[data-top]"), "--ui-popover-position-area")).toContain("block-start");
    expect(style(at("[data-default]"), "--ui-popover-position-area")).toContain("block-end");
  });

  it("dresses the multiselect's stamped trigger and chevron in attribute form", () => {
    const root = mount(`<div data-ui="multiselect">
      <button data-ui="select" data-multiselect-slot="trigger" type="button">
        <span data-multiselect-slot="label">Pick</span>
        <span data-multiselect-slot="icon" aria-hidden="true"></span>
      </button>
    </div>`);
    const icon = root.querySelector("[data-multiselect-slot='icon']")!;
    expect(style(icon, "mask-image")).toContain("data:image/svg+xml");
    expect(Number.parseFloat(style(icon, "inline-size"))).toBeCloseTo(
      lengthPx("var(--ui-select-picker-icon-size)"),
      1,
    );
    expect(style(root.querySelector("[data-multiselect-slot='label']")!, "text-overflow")).toBe(
      "ellipsis",
    );
  });
});
