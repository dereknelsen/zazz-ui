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

  it("a registered non-inheriting utility never reaches ::before", () => {
    const el = mount(`<span style="--registered-content: 'x'">Live</span>`);
    expect(style(el, "content", "::before")).toBe("none");
  });
});
