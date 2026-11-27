"use strict";

/**
 * @fileoverview The link: `data-ui="link"` underlines an element the way prose
 * underlines its anchors, and the `--text-decoration` utility still wins.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useKit } from "../../../test/browser.ts";

describe("link", () => {
  useKit();

  it("underlines with the decoration tokens", () => {
    const root = mount(
      `<p><a href="#" data-plain>a</a> <a href="#" data-ui="link" data-link>b</a></p>`,
    );
    const link = root.querySelector("[data-link]")!;
    expect(style(root.querySelector("[data-plain]")!, "text-decoration-line")).toBe("none");
    expect(style(link, "text-decoration-line")).toBe("underline");
    expect(Number.parseFloat(style(link, "text-decoration-thickness"))).toBeCloseTo(
      lengthPx("var(--decoration-thickness)"),
      1,
    );
    expect(Number.parseFloat(style(link, "text-underline-offset"))).toBeCloseTo(
      lengthPx("var(--decoration-offset)"),
      1,
    );
  });

  it("matches the anchors prose underlines", () => {
    const root = mount(`<div>
      <article data-ui="prose"><p><a href="#" data-prose-link>a</a></p></article>
      <a href="#" data-ui="link" data-link>b</a>
    </div>`);
    const prose = root.querySelector("[data-prose-link]")!;
    const link = root.querySelector("[data-link]")!;
    for (const property of [
      "text-decoration-line",
      "text-decoration-thickness",
      "text-underline-offset",
    ]) {
      expect(style(link, property), property).toBe(style(prose, property));
    }
  });

  it("stacks with a font role", () => {
    const link = mount(`<a href="#" data-ui="link" data-font="sm">a</a>`);
    expect(style(link, "text-decoration-line")).toBe("underline");
    expect(Number.parseFloat(style(link, "font-size"))).toBeCloseTo(
      lengthPx("var(--font-size-sm)"),
      1,
    );
  });

  it("takes a --text-decoration utility ahead of its underline", () => {
    const link = mount(`<a href="#" data-ui="link" style="--text-decoration: none">a</a>`);
    expect(style(link, "text-decoration-line")).toBe("none");
  });
});
