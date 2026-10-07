"use strict";

/**
 * @fileoverview Card: a variant stays on its element, an inline hook reaches a
 * nested card, the 1px border holds across variants, and utilities beat variants.
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

  it("is bare by default; outline, muted, and floating each add padding, the radius, and one treatment", () => {
    const root = mount(`<div>
      <div data-ui="card" data-default>d</div>
      <div data-ui="card" data-card-variant="outline" data-outline>o</div>
      <div data-ui="card" data-card-variant="muted" data-muted>m</div>
      <div data-ui="card" data-card-variant="floating" data-floating>f</div>
      <div data-ui="card" data-card-variant="muted" data-utility style="--p: 2">u</div>
      <div data-swatch style="background-color: var(--color-border)"></div>
      <div data-swatch-muted style="background-color: var(--color-muted)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    const inset = lengthPx("var(--space-md)");
    const radius = lengthPx("var(--radius-lg)");
    const border = background(at("[data-swatch]"));
    const transparent = "rgba(0, 0, 0, 0)";

    // every card keeps a 1px border, so variants line up; only its color changes
    for (const card of root.querySelectorAll('[data-ui="card"]')) {
      expect(style(card, "border-top-width")).toBe("1px");
    }

    const plain = at("[data-default]");
    expect(style(plain, "padding-top")).toBe("0px");
    expect(style(plain, "border-top-color")).toBe(transparent);
    expect(style(plain, "border-top-left-radius")).toBe("0px");
    expect(style(plain, "box-shadow")).toBe("none");

    const outline = at("[data-outline]");
    expect(Number.parseFloat(style(outline, "padding-top"))).toBeCloseTo(inset, 1);
    expect(Number.parseFloat(style(outline, "border-top-left-radius"))).toBeCloseTo(radius, 1);
    expect(style(outline, "border-top-color")).toBe(border);
    expect(style(outline, "box-shadow")).toBe("none");

    const muted = at("[data-muted]");
    expect(Number.parseFloat(style(muted, "padding-top"))).toBeCloseTo(inset, 1);
    expect(Number.parseFloat(style(muted, "border-top-left-radius"))).toBeCloseTo(radius, 1);
    expect(background(muted)).toBe(background(at("[data-swatch-muted]")));
    expect(style(muted, "border-top-color")).toBe(transparent);

    const floating = at("[data-floating]");
    expect(Number.parseFloat(style(floating, "padding-top"))).toBeCloseTo(inset, 1);
    expect(Number.parseFloat(style(floating, "border-top-left-radius"))).toBeCloseTo(radius, 1);
    expect(style(floating, "box-shadow")).not.toBe("none");
    expect(style(floating, "border-top-color")).toBe(border);

    expect(Number.parseFloat(style(at("[data-utility]"), "padding-top"))).toBeCloseTo(scale(2), 1);
  });

  it("takes --rounded and --border-color utilities over its variant", () => {
    const root = mount(`<div>
      <div data-ui="card" data-rounded style="--rounded: var(--radius-sm)">r</div>
      <div data-ui="card" data-card-variant="outline" data-colored style="--border-color: rgb(255, 0, 0)">c</div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-rounded]"), "border-top-left-radius"))).toBeCloseTo(
      lengthPx("var(--radius-sm)"),
      1,
    );
    expect(style(at("[data-colored]"), "border-top-color")).toBe("rgb(255, 0, 0)");
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
