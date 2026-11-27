"use strict";

/**
 * @fileoverview `data-font="<role>"` sets a typography role on any element: the
 * type scale's size with its leading and tracking. A role beats the element's
 * tag and its primitive; a utility overrides one property at a time.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useKit } from "../../../test/browser.ts";

describe("font roles", () => {
  useKit();

  const size = (el: Element) => Number.parseFloat(style(el, "font-size"));

  it("a role followed by --font-size and --font-weight keeps its family and leading (claim 12)", () => {
    const root = mount(`<div>
      <p data-font="lg" data-role>a</p>
      <p data-font="lg" data-utility style="--font-size: var(--font-size-xl); --font-weight: 500">b</p>
    </div>`);
    const role = root.querySelector("[data-role]")!;
    const utility = root.querySelector("[data-utility]")!;
    expect(size(role)).toBeCloseTo(lengthPx("var(--font-size-lg)"), 1);
    expect(size(utility)).toBeCloseTo(lengthPx("var(--font-size-xl)"), 1);
    expect(style(utility, "font-weight")).toBe("500");
    expect(style(utility, "font-family")).toBe(style(role, "font-family"));
    // the role's leading is relative, so it scales with the overridden size
    const ratio = (el: Element) => Number.parseFloat(style(el, "line-height")) / size(el);
    expect(ratio(utility)).toBeCloseTo(ratio(role), 2);
  });

  it("gives any element the role a native heading wears", () => {
    const root = mount(
      `<div><h2 data-native>a</h2><p data-font="h2" data-role>b</p><p data-plain>c</p></div>`,
    );
    const native = root.querySelector("[data-native]")!;
    const role = root.querySelector("[data-role]")!;
    for (const property of ["font-size", "font-family", "font-weight", "line-height"]) {
      expect(style(role, property), property).toBe(style(native, property));
    }
    expect(style(role, "letter-spacing")).toBe(style(native, "letter-spacing"));
    expect(style(role, "text-wrap")).toBe(style(native, "text-wrap"));
    expect(size(native)).not.toBe(size(root.querySelector("[data-plain]")!));
  });

  it.each(["display", "h1", "h2", "h3", "h4", "h5", "h6"])(
    "the %s role reads its own size and the heading weight",
    (role) => {
      const el = mount(`<p data-font="${role}">a</p>`);
      expect(size(el)).toBeCloseTo(lengthPx(`var(--font-size-${role})`), 1);
      expect(style(el, "font-weight")).toBe(
        style(document.documentElement, "--font-weight-heading").trim(),
      );
    },
  );

  it.each(["2xs", "xs", "sm", "md", "lg", "xl", "2xl"])(
    "the %s role reads its own size and leading",
    (role) => {
      // the probe resolves the same size and leading tokens without the role
      const root = mount(`<div>
        <p data-font="${role}" data-role>a</p>
        <p data-probe style="font-size: var(--font-size-${role}); line-height: var(--leading-${role})">a</p>
      </div>`);
      const el = root.querySelector("[data-role]")!;
      const probe = root.querySelector("[data-probe]")!;
      expect(size(el)).toBeCloseTo(lengthPx(`var(--font-size-${role})`), 1);
      expect(style(el, "line-height")).toBe(style(probe, "line-height"));
    },
  );

  it("the eyebrow role is small, uppercase, and tracked out", () => {
    const el = mount(`<span data-font="eyebrow">a</span>`);
    expect(size(el)).toBeCloseTo(lengthPx("var(--font-size-eyebrow)"), 1);
    expect(style(el, "text-transform")).toBe("uppercase");
    expect(Number.parseFloat(style(el, "letter-spacing"))).toBeGreaterThan(0);
  });

  it("resizes a native heading and leaves its family and weight alone", () => {
    const root = mount(`<div><h3 data-sized data-font="lg">a</h3><h3 data-plain>b</h3></div>`);
    const sized = root.querySelector("[data-sized]")!;
    const plain = root.querySelector("[data-plain]")!;
    expect(size(sized)).toBeCloseTo(lengthPx("var(--font-size-lg)"), 1);
    expect(style(sized, "font-weight")).toBe(style(plain, "font-weight"));
    expect(style(sized, "font-family")).toBe(style(plain, "font-family"));
  });

  it("beats the font size of the primitive it sits on", () => {
    const root = mount(`<div>
      <span data-ui="badge" data-badge data-font="lg">a</span>
      <button data-ui="button" data-button data-font="xs">b</button>
    </div>`);
    const px = (role: string) => lengthPx(`var(--font-size-${role})`);
    expect(size(root.querySelector("[data-badge]")!)).toBeCloseTo(px("lg"), 1);
    expect(size(root.querySelector("[data-button]")!)).toBeCloseTo(px("xs"), 1);
  });

  it("beats the font size a primitive gives one of its slots", () => {
    const root = mount(`<div>
      <ui-tooltip>
        <button data-ui="button" aria-describedby="font-tip">a</button>
        <div data-tooltip-slot="content" id="font-tip" popover="hint" data-tip data-font="lg">b</div>
      </ui-tooltip>
      <div data-ui="field">
        <label data-field-slot="label" data-label data-font="lg">c</label>
        <p data-field-slot="description" data-description data-font="lg">d</p>
      </div>
    </div>`);
    const lg = lengthPx("var(--font-size-lg)");
    for (const selector of ["[data-tip]", "[data-label]", "[data-description]"]) {
      expect(size(root.querySelector(selector)!), selector).toBeCloseTo(lg, 1);
    }
  });

  it("loses to a --font-size utility on a primitive", () => {
    const el = mount(
      `<span data-ui="badge" data-font="lg" style="--font-size: var(--font-size-2xl)">a</span>`,
    );
    expect(size(el)).toBeCloseTo(lengthPx("var(--font-size-2xl)"), 1);
  });

  it("an unknown value styles nothing", () => {
    const root = mount(`<div><p data-font="huge" data-odd>a</p><p data-plain>b</p></div>`);
    expect(size(root.querySelector("[data-odd]")!)).toBe(size(root.querySelector("[data-plain]")!));
  });
});
