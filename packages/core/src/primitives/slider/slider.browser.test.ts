"use strict";

/**
 * @fileoverview The slider: the thumb takes its size from the
 * `:root` hook, and a subtree hook reaches it.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useKit } from "../../../test/browser.ts";

describe("slider", () => {
  useKit();

  // Pseudo-element boxes cannot be measured, so the test reads the hooks the
  // thumb and track rules consume, on the element they inherit through.
  it("reaches the thumb hook from :root or a subtree, and derives the thumb offset", () => {
    const root = mount(`<div>
      <input type="range" data-default />
      <div style="--ui-slider-thumb-size: 40px; --ui-slider-track-h: 10px"><input type="range" data-subtree /></div>
    </div>`);
    const plain = root.querySelector("[data-default]")!;
    const themed = root.querySelector("[data-subtree]")!;
    expect(lengthPx(style(plain, "--ui-slider-thumb-size"))).toBeCloseTo(
      lengthPx("var(--ui-slider-thumb-size)"),
      1,
    );
    expect(style(themed, "--ui-slider-thumb-size")).toBe("40px");
    expect(style(themed, "--ui-slider-thumb-offset")).toContain("10px");
  });
});
