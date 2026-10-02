"use strict";

/**
 * @fileoverview The progress bar: the native element is the track,
 * dual-mode `--h` and a `--bg` utility apply through the chain, and the
 * indeterminate stripe still paints.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

describe("progress", () => {
  useKit();

  it("takes the track height from the hook, or from a scale-number --h utility", () => {
    const root = mount(`<div>
      <progress data-ui="progress" data-default max="100" value="40"></progress>
      <progress data-ui="progress" data-utility max="100" value="40" style="--h: 3; --bg: rgb(1, 2, 3)"></progress>
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

  it("paints the indeterminate stripe", () => {
    const el = mount(`<progress data-ui="progress" aria-label="Loading"></progress>`);
    expect(style(el, "background-image")).toContain("linear-gradient");
  });
});
