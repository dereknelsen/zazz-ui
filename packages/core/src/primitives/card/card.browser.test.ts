"use strict";

/**
 * @fileoverview Card: a variant stays on its element, an
 * inline hook reaches a nested card, and a dual-mode `--gap` utility applies.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

const background = (el: Element) => style(el, "background-color");

describe("card (claim 26)", () => {
  useKit();

  it("a variant stays on its element; an inline hook reaches a nested card", () => {
    const root = mount(`<div>
      <div data-ui="card" data-reference>r</div>
      <div data-ui="card" data-card-variant="muted" data-outer><div data-ui="card" data-inner>i</div></div>
      <div data-ui="card" style="--ui-card-bg: rgb(255, 0, 0)"><div data-ui="card" data-hooked>h</div></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(background(at("[data-outer]"))).not.toBe(background(at("[data-reference]")));
    expect(background(at("[data-inner]"))).toBe(background(at("[data-reference]")));
    expect(background(at("[data-hooked]"))).toBe("rgb(255, 0, 0)");
  });

  it("is a grid with the gap hook, or a --gap utility", () => {
    const root = mount(`<div>
      <div data-ui="card" data-default><p>a</p><p>b</p></div>
      <div data-ui="card" data-utility style="--gap: 4"><p>a</p><p>b</p></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-default]"), "display")).toBe("grid");
    expect(Number.parseFloat(style(at("[data-default]"), "row-gap"))).toBeCloseTo(
      lengthPx("var(--ui-card-gap)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "row-gap"))).toBeCloseTo(scale(4), 1);
  });
});
