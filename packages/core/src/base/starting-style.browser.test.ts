"use strict";

/**
 * @fileoverview The `starting` state: `--<utility>--starting` is the value in the
 * element's `@starting-style`, so a `--transition` animates from it to the
 * utility's usual value on first render and when the element leaves
 * `display: none`. A slow linear transition keeps the computed value near its
 * start while the test reads it.
 */

import { describe, expect, it } from "vite-plus/test";
import { frame, mount, style, useKit } from "../../test/browser.ts";

const SLOW = "--transition: opacity 100s linear";

describe("starting state", () => {
  useKit();

  it("transitions from --<utility>--starting on first render", () => {
    const el = mount(`<p style="--opacity--starting: 0; --opacity: 1; ${SLOW}">x</p>`);
    expect(Number(style(el, "opacity"))).toBeLessThan(0.05);
  });

  it("transitions toward the utility's default when there is no base", () => {
    const el = mount(`<p style="--opacity--starting: 0; ${SLOW}">x</p>`);
    expect(Number(style(el, "opacity"))).toBeLessThan(0.05);
  });

  it("transitions again when the element leaves display: none", async () => {
    const el = mount(`<p hidden style="--opacity--starting: 0; --opacity: 1; ${SLOW}">x</p>`);
    await frame();
    el.hidden = false;
    expect(Number(style(el, "opacity"))).toBeLessThan(0.05);
  });

  it("is not the resting value: without a transition the element lands on its base", () => {
    const el = mount(`<p style="--opacity--starting: 0; --opacity: 0.5">x</p>`);
    expect(style(el, "opacity")).toBe("0.5");
  });

  it("leaves elements without a starting tier alone", () => {
    const el = mount(`<p style="--opacity: 0.5; ${SLOW}">x</p>`);
    expect(style(el, "opacity")).toBe("0.5");
  });
});
