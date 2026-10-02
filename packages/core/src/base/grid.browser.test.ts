"use strict";

/**
 * @fileoverview Utilities on the no-base allowlist apply a tier
 * without a base value on a plain element; utilities outside it do nothing.
 */

import { describe, expect, it } from "vite-plus/test";
import { atWidth, mount, style, useKit } from "../../test/browser.ts";

const tracks = (el: Element) => style(el, "grid-template-columns").trim().split(/\s+/).length;

describe("no-base tiers", () => {
  useKit();

  it("--display: grid; --grid-cols--md: 3 on a div is one column below md and three above", async () => {
    const el = mount(
      `<div style="--display: grid; --grid-cols--md: 3"><i></i><i></i><i></i></div>`,
    );
    await atWidth(700);
    expect(style(el, "display")).toBe("grid");
    expect(tracks(el)).toBe(1);
    await atWidth(800);
    expect(tracks(el)).toBe(3);
  });

  it("--display--md: none alone leaves display untouched", async () => {
    const el = mount(`<div style="--display--md: none"></div>`);
    await atWidth(800);
    expect(style(el, "display")).toBe("block");
  });
});
