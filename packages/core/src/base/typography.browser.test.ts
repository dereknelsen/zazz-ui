"use strict";

/**
 * @fileoverview The fluid type scale behind `--font-size-*`, and the font-weight
 * keywords and reset hooks. The `data-font` roles and prose have their own tests
 * under `primitives/font/` and `primitives/prose/`.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { atWidth, mount, style, useKit } from "../../test/browser.ts";

describe("fluid type scale", () => {
  useKit();
  afterEach(() => document.documentElement.removeAttribute("style"));

  const size = (el: Element) => Number.parseFloat(style(el, "font-size"));
  const roles = () =>
    mount(
      `<div><h1>a</h1><p data-font="lg">b</p><p data-font="sm">c</p><p data-font="2xs">d</p></div>`,
    );

  it("each step sits at its small end at --fluid-min and its large end at --fluid-max", async () => {
    const root = roles();
    const [h1, lg, sm, xs2] = [...root.children];
    await atWidth(400);
    expect(size(h1)).toBeCloseTo(16 * 1.125 ** 7, 1);
    expect(size(lg)).toBeCloseTo(16 * 1.125, 1);
    expect(size(sm)).toBeCloseTo(16 * 0.8, 1);
    expect(size(xs2)).toBeCloseTo(16 * 0.5787, 1);
    await atWidth(1280);
    expect(size(h1)).toBeCloseTo(16 * 1.25 ** 7, 1);
    expect(size(lg)).toBeCloseTo(16 * 1.25, 1);
    expect(size(sm)).toBeCloseTo(16 * 0.8, 1);
    expect(size(xs2)).toBeCloseTo(16 * 0.5787, 1);
  });

  it("the scale interpolates linearly between the ends and holds outside them", async () => {
    const root = roles();
    const lg = root.children[1];
    await atWidth(840);
    expect(size(lg)).toBeCloseTo(16 * 1.1875, 1);
    await atWidth(320);
    expect(size(lg)).toBeCloseTo(16 * 1.125, 1);
    await atWidth(1600);
    expect(size(lg)).toBeCloseTo(16 * 1.25, 1);
  });

  it("a :root control retunes every step", async () => {
    const root = roles();
    await atWidth(1280);
    document.documentElement.style.setProperty("--typeset-scale-max", "1.5");
    document.documentElement.style.setProperty("--typeset-base-max", "1.125rem");
    expect(size(root.children[0])).toBeCloseTo(18 * 1.5 ** 7, 0);
    expect(size(root.children[1])).toBeCloseTo(18 * 1.5, 1);
  });
});

describe("font-weight keywords and reset hooks", () => {
  useKit();

  it("--font-weight takes heading, body, and strong, and numbers as usual", () => {
    const root = mount(`<div>
      <span data-strong style="--font-weight: strong">a</span>
      <span data-heading style="--font-weight: heading">b</span>
      <span data-body style="--font-weight: body">c</span>
      <span data-num style="--font-weight: 700">d</span>
    </div>`);
    const weight = (selector: string) => style(root.querySelector(selector)!, "font-weight");
    const token = (name: string) => style(document.documentElement, `--font-weight-${name}`).trim();
    expect(weight("[data-strong]")).toBe(token("strong"));
    expect(weight("[data-heading]")).toBe(token("heading"));
    expect(weight("[data-body]")).toBe(token("body"));
    expect(weight("[data-num]")).toBe("700");
  });

  it("native elements read their reset hooks, so one declaration retunes them", () => {
    const root = mount(`<div>
      <b data-b style="--strong-font-weight: 800">bold</b>
      <select multiple><optgroup label="g"><option data-option style="--optgroup-option-pl: 2rem">o</option></optgroup></select>
    </div>`);
    expect(style(root.querySelector("[data-b]")!, "font-weight")).toBe("800");
    expect(style(root.querySelector("[data-option]")!, "padding-inline-start")).toBe("32px");
  });
});
