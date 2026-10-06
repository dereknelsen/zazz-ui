"use strict";

/**
 * @fileoverview Pseudo-element utilities: an unregistered
 * `--before-*` utility inherits into `::before`; a registered non-inheriting one
 * would not.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, scale, style, useCss, useKit } from "../../test/browser.ts";

describe("pseudo-element utilities", () => {
  useKit();
  useCss(`
    @property --registered-content { syntax: "*"; inherits: false; }
    :where([style*="--registered-content:"])::before { content: var(--registered-content); }
  `);

  it("--before-content, --before-w, --before-bg, and --before-rounded draw a dot", () => {
    const el = mount(
      `<span style="--display: inline-flex; --before-content: ''; --before-w: 2; --before-h: 2; --before-rounded: 9999px; --before-bg: rgb(0, 128, 0)">Live</span>`,
    );
    expect(style(el, "content", "::before")).toBe('""');
    expect(Number.parseFloat(style(el, "inline-size", "::before"))).toBeCloseTo(scale(2), 1);
    expect(style(el, "border-radius", "::before")).toBe("9999px");
    // relative oklch: compare with a probe drawn the same way
    const probe = document.createElement("i");
    probe.style.cssText = "background-color: oklch(from rgb(0, 128, 0) l c h / 1)";
    document.body.append(probe);
    expect(style(el, "background-color", "::before")).toBe(style(probe, "background-color"));
  });

  it("positions, lays out, and paints a ::before accent bar", () => {
    const el = mount(
      `<div style="--position: relative; --p: 4; --before-content: ''; --before-position: absolute; --before-inset-y: 0; --before-left: 0; --before-w: 2; --before-display: block; --before-z: 2; --before-opacity: 0.5; --before-bg: rgb(0, 128, 0); --before-rounded: 4px">Note</div>`,
    );
    expect(style(el, "position", "::before")).toBe("absolute");
    expect(style(el, "inset-block-start", "::before")).toBe("0px");
    expect(style(el, "inset-block-end", "::before")).toBe("0px");
    expect(style(el, "inset-inline-start", "::before")).toBe("0px");
    expect(style(el, "display", "::before")).toBe("block");
    expect(style(el, "z-index", "::before")).toBe("2");
    expect(style(el, "opacity", "::before")).toBe("0.5");
    expect(Number.parseFloat(style(el, "inline-size", "::before"))).toBeCloseTo(scale(2), 1);
    expect(Number.parseFloat(style(el, "block-size", "::before"))).toBeGreaterThan(0);
  });

  it("spaces and transforms a pseudo-element", () => {
    const el = mount(
      `<span style="--display: inline-block; --after-content: '→'; --after-p: 2; --after-pl: 1; --after-translate: 0 2px; --after-transition: translate 0.2s; --after-font-size: 12px">Go</span>`,
    );
    expect(Number.parseFloat(style(el, "padding-inline-end", "::after"))).toBeCloseTo(scale(2), 1);
    expect(Number.parseFloat(style(el, "padding-inline-start", "::after"))).toBeCloseTo(
      scale(1),
      1,
    );
    expect(style(el, "translate", "::after")).toBe("0px 2px");
    expect(style(el, "transition-property", "::after")).toBe("translate");
    expect(style(el, "font-size", "::after")).toBe("12px");
  });

  it("a registered non-inheriting utility never reaches ::before", () => {
    const el = mount(`<span style="--registered-content: 'x'">Live</span>`);
    expect(style(el, "content", "::before")).toBe("none");
  });
});
