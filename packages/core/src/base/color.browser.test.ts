"use strict";

/**
 * @fileoverview Color and the effects composition: `--bg` with alpha
 * over `light-dark()` tokens, state tiers on color, and ring + shadow sharing
 * one box-shadow.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { mount, style, useKit } from "../../test/browser.ts";

const BOX = "inline-size: 100px; block-size: 40px;";

describe("color and effects", () => {
  useKit();

  it("--bg with --bg-alpha renders the relative oklch color, over a light-dark() token too", () => {
    const root = mount(`
      <div>
        <div data-a style="${BOX} --bg: var(--color-primary); --bg-alpha: .5"></div>
        <div data-a-probe style="${BOX} background-color: oklch(from var(--color-primary) l c h / .5)"></div>
        <div data-b style="${BOX} --bg: var(--color-card)"></div>
        <div data-b-probe style="${BOX} background-color: oklch(from var(--color-card) l c h / 1)"></div>
      </div>
    `);
    const bg = (sel: string) => style(root.querySelector(sel)!, "background-color");
    expect(bg("[data-a]")).toBe(bg("[data-a-probe]"));
    expect(bg("[data-a]")).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg("[data-b]")).toBe(bg("[data-b-probe]"));
  });

  it("--text--hover changes the text color on hover", async () => {
    const el = mount(
      `<div style="${BOX} --text: rgb(255, 0, 0); --text--hover: rgb(0, 0, 255)">x</div>`,
    );
    expect(style(el, "color")).toBe("rgb(255, 0, 0)");
    await userEvent.hover(el);
    expect(style(el, "color")).toBe("rgb(0, 0, 255)");
    await userEvent.unhover(el);
  });

  it("--ring and --shadow both appear in one box-shadow", () => {
    const el = mount(`<div style="${BOX} --ring: 2px; --shadow: 0 4px 8px rgb(0, 0, 0)"></div>`);
    const shadow = style(el, "box-shadow");
    expect(shadow).toContain("0px 0px 0px 2px");
    expect(shadow).toContain("0px 4px 8px");
  });
});
