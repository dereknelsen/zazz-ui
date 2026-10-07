"use strict";

/**
 * @fileoverview Callout: the default is an outline card's surface, muted a muted
 * card's, and the status variants follow the matching badge.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

const TINTED = ["info", "success", "warning"] as const;

describe("callout", () => {
  useKit();

  it("is a bordered card surface by default and a muted card surface when muted", () => {
    const root = mount(`<div>
      <aside data-ui="callout" data-default>c</aside>
      <aside data-ui="callout" data-callout-variant="muted" data-muted>c</aside>
      <div data-swatch-card style="background-color: var(--color-card); color: var(--color-card-foreground)"></div>
      <div data-swatch-muted style="background-color: var(--color-muted); color: var(--color-foreground)"></div>
      <div data-swatch-border style="background-color: var(--color-border)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    const plain = at("[data-default]");
    const muted = at("[data-muted]");

    expect(style(plain, "display")).toBe("grid");
    expect(Number.parseFloat(style(plain, "padding-top"))).toBeCloseTo(
      lengthPx("var(--ui-callout-p)"),
      1,
    );
    expect(Number.parseFloat(style(plain, "row-gap"))).toBeCloseTo(
      lengthPx("var(--ui-callout-gap)"),
      1,
    );
    expect(Number.parseFloat(style(plain, "border-top-left-radius"))).toBeCloseTo(
      lengthPx("var(--ui-callout-rounded)"),
      1,
    );
    expect(style(plain, "background-color")).toBe(
      style(at("[data-swatch-card]"), "background-color"),
    );
    expect(style(plain, "color")).toBe(style(at("[data-swatch-card]"), "color"));
    expect(style(plain, "border-top-width")).toBe("1px");
    expect(style(plain, "border-top-color")).toBe(
      style(at("[data-swatch-border]"), "background-color"),
    );
    expect(style(plain, "box-shadow")).toBe("none");

    expect(style(muted, "background-color")).toBe(
      style(at("[data-swatch-muted]"), "background-color"),
    );
    expect(style(muted, "color")).toBe(style(at("[data-swatch-muted]"), "color"));
    // the border stays so every variant is the same size; muted hides it
    expect(style(muted, "border-top-width")).toBe("1px");
    expect(style(muted, "border-top-color")).toBe("rgba(0, 0, 0, 0)");
    for (const property of ["padding-top", "row-gap", "border-top-left-radius"]) {
      expect(style(muted, property), property).toBe(style(plain, property));
    }
  });

  it.each(TINTED)(
    "%s takes the badge's tint and border, with text mixed toward the foreground",
    (variant) => {
      const root = mount(`<div>
      <aside data-ui="callout" data-callout-variant="${variant}" data-callout>c</aside>
      <span data-ui="badge" data-badge-variant="${variant}" data-badge>b</span>
      <span data-swatch style="color: color-mix(in xyz, var(--color-${variant}), var(--color-foreground))">s</span>
    </div>`);
      const callout = root.querySelector("[data-callout]")!;
      const badge = root.querySelector("[data-badge]")!;
      expect(style(callout, "background-color")).toBe(style(badge, "background-color"));
      expect(style(callout, "border-top-color")).toBe(style(badge, "border-top-color"));
      expect(style(callout, "border-top-width")).toBe("1px");
      expect(style(callout, "color")).toBe(style(root.querySelector("[data-swatch]")!, "color"));
    },
  );

  it("destructive takes the destructive badge's solid fill, text, and border", () => {
    const root = mount(`<div>
      <aside data-ui="callout" data-callout-variant="destructive" data-callout>c</aside>
      <span data-ui="badge" data-badge-variant="destructive" data-badge>b</span>
    </div>`);
    const callout = root.querySelector("[data-callout]")!;
    const badge = root.querySelector("[data-badge]")!;
    for (const property of ["background-color", "color", "border-top-color"]) {
      expect(style(callout, property), property).toBe(style(badge, property));
    }
    expect(style(callout, "border-top-width")).toBe("1px");
  });

  it("keeps a variant on its element and takes --p and --gap utilities", () => {
    const root = mount(`<div>
      <aside data-ui="callout" data-reference>r</aside>
      <aside data-ui="callout" data-callout-variant="info" data-outer>
        <div data-ui="callout" data-inner>i</div>
      </aside>
      <aside data-ui="callout" data-utility style="--p: 2; --gap: 4"><p>a</p><p>b</p></aside>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-outer]"), "background-color")).not.toBe(
      style(at("[data-reference]"), "background-color"),
    );
    expect(style(at("[data-inner]"), "background-color")).toBe(
      style(at("[data-reference]"), "background-color"),
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "padding-top"))).toBeCloseTo(scale(2), 1);
    expect(Number.parseFloat(style(at("[data-utility]"), "row-gap"))).toBeCloseTo(scale(4), 1);
  });
});
