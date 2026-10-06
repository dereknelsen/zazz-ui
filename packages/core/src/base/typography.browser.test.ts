"use strict";

/**
 * @fileoverview `data-ui="text-*"` roles set the type
 * system, native headings get their role without a token, utilities override one
 * property at a time, and `data-ui="prose"` is the rich-text switch.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useKit } from "../../test/browser.ts";

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
