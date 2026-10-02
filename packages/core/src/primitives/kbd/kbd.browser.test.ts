"use strict";

/**
 * @fileoverview The kbd: the bare `<kbd>` (styled in the reset layer)
 * takes a dual-mode utility and a subtree hook, and the group works in both its
 * tag and attribute forms.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

describe("kbd", () => {
  useKit();

  it("a bare kbd takes a scale-number --min-w and inherits a subtree --ui-kbd-bg hook", () => {
    const root = mount(`<div style="--ui-kbd-bg: rgb(1, 2, 3)">
      <kbd data-utility style="--min-w: 8">K</kbd>
    </div>`);
    const key = root.querySelector("[data-utility]")!;
    expect(Number.parseFloat(style(key, "min-inline-size"))).toBeCloseTo(scale(8), 1);
    expect(style(key, "background-color")).toBe("rgb(1, 2, 3)");
  });

  it("the group spaces keys by --ui-kbd-group-gap in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-kbd-group data-tag><kbd>⌘</kbd><kbd>K</kbd></ui-kbd-group>
      <span data-ui="kbd-group" data-attr><kbd>⌘</kbd><kbd>K</kbd></span>
    </div>`);
    const gap = lengthPx("var(--ui-kbd-group-gap)");
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const group = root.querySelector(selector)!;
      expect(style(group, "display"), selector).toBe("inline-flex");
      expect(Number.parseFloat(style(group, "column-gap")), selector).toBeCloseTo(gap, 1);
    }
  });
});
