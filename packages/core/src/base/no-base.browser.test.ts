"use strict";

/**
 * @fileoverview The no-base allowlist for padding and `--bg`: a tier alone
 * works on a plain element (the reset zeroes padding and paints nothing), does
 * nothing on a primitive, and keeps the base's padding or paint on the elements
 * the base styles (a list's indent, inline code).
 */

import { describe, expect, it } from "vite-plus/test";
import { atWidth, mount, scale, style, useKit } from "../../test/browser.ts";

/** True for a fully transparent color in either serialization (`rgba(0, 0, 0, 0)`, `oklch(… / 0)`). */
const transparent = (color: string) => /\/ 0\)$|^rgba\(0, 0, 0, 0\)$|^transparent$/.test(color);

describe("no-base padding and background", () => {
  useKit();

  it("--px--md alone pads a plain element from md and leaves it unpadded below", async () => {
    const probe = mount(`<div><div data-probe style="--px--md: 4">x</div></div>`).querySelector(
      "[data-probe]",
    )!;
    await atWidth(767);
    expect(style(probe, "padding-inline-start")).toBe("0px");
    await atWidth(768);
    expect(parseFloat(style(probe, "padding-inline-start"))).toBeCloseTo(scale(4), 1);
  });

  it("--bg--hover alone leaves a plain element transparent at rest", () => {
    const probe = mount(`<div data-probe style="--bg--hover: red">x</div>`);
    expect(transparent(style(probe, "background-color"))).toBe(true);
  });

  it("on a primitive reaches its own chain (SPEC §9), not the no-base rule", async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <button type="button" data-ui="button" data-plain>b</button>
      <button type="button" data-ui="button" data-tier style="--px--md: 0; --bg--hover: red">b</button>
    </div>`);
    const plain = root.querySelector("[data-plain]")!;
    const tier = root.querySelector("[data-tier]")!;
    // a button reads --px through its hook chain, so the md tier applies without a base
    expect(style(plain, "padding-inline-start")).not.toBe("0px");
    expect(style(tier, "padding-inline-start")).toBe("0px");
    // and the hover tier leaves its rest paint alone
    expect(style(tier, "background-color")).toBe(style(plain, "background-color"));
  });

  it("keeps the base's padding and paint on the elements it styles", async () => {
    await atWidth(767);
    const root = mount(`<div data-ui="prose">
      <ul data-plain><li>a</li></ul>
      <ul data-tier style="--pl--md: 0"><li>a</li></ul>
      <code data-code style="--bg--hover: red">c</code>
    </div>`);
    const plain = root.querySelector("[data-plain]")!;
    const tier = root.querySelector("[data-tier]")!;
    expect(style(tier, "padding-inline-start")).toBe(style(plain, "padding-inline-start"));
    expect(style(plain, "padding-inline-start")).not.toBe("0px");
    expect(transparent(style(root.querySelector("[data-code]")!, "background-color"))).toBe(false);
  });
});
