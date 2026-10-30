"use strict";

/**
 * @fileoverview `data-ui="text-*"` roles set the type
 * system, native headings get their role without a token, utilities override one
 * property at a time, and `data-ui="prose"` is the rich-text switch.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { atWidth, lengthPx, mount, style, useKit } from "../../test/browser.ts";

describe("typography roles", () => {
  useKit();

  it("a role followed by --font-size and --font-weight keeps its family and leading (claim 12)", () => {
    const root = mount(`<div>
      <p data-ui="text-lg" data-role>a</p>
      <p data-ui="text-lg" data-utility style="--font-size: var(--font-size-xl); --font-weight: 500">b</p>
    </div>`);
    const role = root.querySelector("[data-role]")!;
    const utility = root.querySelector("[data-utility]")!;
    expect(Number.parseFloat(style(role, "font-size"))).toBeCloseTo(
      lengthPx("var(--font-size-lg)"),
      1,
    );
    expect(Number.parseFloat(style(utility, "font-size"))).toBeCloseTo(
      lengthPx("var(--font-size-xl)"),
      1,
    );
    expect(style(utility, "font-weight")).toBe("500");
    expect(style(utility, "font-family")).toBe(style(role, "font-family"));
    // the role's leading is relative, so it scales with the overridden size
    const ratio = (el: Element) =>
      Number.parseFloat(style(el, "line-height")) / Number.parseFloat(style(el, "font-size"));
    expect(ratio(utility)).toBeCloseTo(ratio(role), 2);
  });

  it("a native heading wears its role; the token gives any element the same role", () => {
    const root = mount(
      `<div><h2 data-native>a</h2><p data-ui="text-h2" data-token>b</p><p data-plain>c</p></div>`,
    );
    const native = root.querySelector("[data-native]")!;
    const token = root.querySelector("[data-token]")!;
    expect(style(native, "font-size")).toBe(style(token, "font-size"));
    expect(style(native, "font-family")).toBe(style(token, "font-family"));
    expect(style(native, "font-size")).not.toBe(
      style(root.querySelector("[data-plain]")!, "font-size"),
    );
  });

  it("prose spaces its flow content", () => {
    const root = mount(`<article data-ui="prose"><p>one</p><p data-second>two</p></article>`);
    expect(
      Number.parseFloat(style(root.querySelector("[data-second]")!, "margin-block-start")),
    ).toBeGreaterThan(0);
  });

  it("not-prose stops prose styling for its subtree", () => {
    const root = mount(`<article data-ui="prose">
      <p>one</p>
      <div data-ui="not-prose" data-out><p>a</p><p data-p>b</p><ul data-ul><li>x</li></ul></div>
      <p data-after>two</p>
    </article>`);
    const px = (selector: string, property: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, property));
    expect(px("[data-p]", "margin-block-start")).toBe(0);
    expect(style(root.querySelector("[data-ul]")!, "list-style-type")).toBe("none");
    expect(px("[data-ul]", "padding-inline-start")).toBe(0);
    // prose resumes after the subtree
    expect(px("[data-after]", "margin-block-start")).toBeGreaterThan(0);
  });

  it("a prose nested inside not-prose styles its own content again", () => {
    const root = mount(`<article data-ui="prose">
      <div data-ui="not-prose"><div data-ui="prose"><p>a</p><p data-inner>b</p></div></div>
    </article>`);
    expect(
      Number.parseFloat(style(root.querySelector("[data-inner]")!, "margin-block-start")),
    ).toBeGreaterThan(0);
  });

  it("the size roles run 2xs to 2xl, each reading its own size, leading and tracking tokens", () => {
    const root = mount(
      `<div>${["2xs", "xs", "sm", "md", "lg", "xl", "2xl"].map((size) => `<p data-ui="text-${size}" data-size="${size}">a</p>`).join("")}</div>`,
    );
    const probe = (token: string) => {
      const el = document.createElement("span");
      el.style.setProperty("font-size", `var(${token})`);
      root.append(el);
      const value = getComputedStyle(el).fontSize;
      el.remove();
      return value;
    };
    for (const size of ["2xs", "2xl"]) {
      const el = root.querySelector(`[data-size="${size}"]`)!;
      expect(style(el, "font-size"), size).toBe(probe(`--font-size-${size}`));
      expect(style(el, "font-size"), size).not.toBe(
        style(root.querySelector('[data-size="md"]')!, "font-size"),
      );
    }
  });
});

describe("fluid type scale", () => {
  useKit();
  afterEach(() => document.documentElement.removeAttribute("style"));

  const size = (el: Element) => Number.parseFloat(style(el, "font-size"));
  const roles = () =>
    mount(
      `<div><h1>a</h1><p data-ui="text-lg">b</p><p data-ui="text-sm">c</p><p data-ui="text-2xs">d</p></div>`,
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

  it("data-prose-size resizes the prose it sits on, not the page around it", async () => {
    await atWidth(1280);
    const root = mount(`<div>
      <article data-ui="prose" data-prose-size="lg"><h2 data-h2>a</h2><p data-p>b</p></article>
      <article data-ui="prose"><h2 data-plain-h2>a</h2><p data-plain-p>b</p></article>
    </div>`);
    const at = (selector: string) => size(root.querySelector(selector)!);
    expect(at("[data-p]")).toBeGreaterThan(at("[data-plain-p]"));
    expect(at("[data-h2]")).toBeGreaterThan(at("[data-plain-h2]"));
    expect(at("[data-plain-p]")).toBeCloseTo(16, 1);
  });

  it('data-prose-size="lg" sets an 18px base with 1.8 leading', async () => {
    await atWidth(1280);
    const p = mount(
      `<article data-ui="prose" data-prose-size="lg"><p>a</p></article>`,
    ).firstElementChild!;
    expect(size(p)).toBeCloseTo(18, 1);
    expect(Number.parseFloat(style(p, "line-height"))).toBeCloseTo(18 * 1.8, 0);
  });

  it(":root controls and hooks still reach a sized prose", async () => {
    await atWidth(1280);
    const mountLg = () =>
      mount(`<article data-ui="prose" data-prose-size="lg"><h2>a</h2><p>b</p><p>c</p></article>`);
    const before = mountLg();
    const h2 = size(before.children[0]);
    const margin = Number.parseFloat(style(before.children[2], "margin-block-start"));
    document.documentElement.style.setProperty("--typeset-scale-max", "1.5");
    document.documentElement.style.setProperty("--ui-prose-flow", "2");
    const after = mountLg();
    expect(size(after.children[0])).toBeGreaterThan(h2);
    expect(Number.parseFloat(style(after.children[2], "margin-block-start"))).toBeCloseTo(
      margin * 2,
      1,
    );
  });

  it('data-prose-size="sm" tightens size and flow', async () => {
    await atWidth(1280);
    const root = mount(`<div>
      <article data-ui="prose" data-prose-size="sm"><p>a</p><p data-p>b</p></article>
      <article data-ui="prose"><p>a</p><p data-plain>b</p></article>
    </div>`);
    const p = root.querySelector("[data-p]")!;
    const plain = root.querySelector("[data-plain]")!;
    expect(size(p)).toBeLessThan(size(plain));
    expect(Number.parseFloat(style(p, "margin-block-start"))).toBeLessThan(
      Number.parseFloat(style(plain, "margin-block-start")),
    );
  });

  it("--ui-prose-flow scales the space between prose blocks", () => {
    const root = mount(`<div>
      <article data-ui="prose" style="--ui-prose-flow: 2"><p>a</p><p data-double>b</p></article>
      <article data-ui="prose"><p>a</p><p data-single>b</p></article>
    </div>`);
    const margin = (selector: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, "margin-block-start"));
    expect(margin("[data-single]")).toBeGreaterThan(0);
    expect(margin("[data-double]")).toBeCloseTo(margin("[data-single]") * 2, 1);
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
