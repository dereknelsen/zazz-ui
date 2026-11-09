"use strict";

/**
 * @fileoverview Touch targets: `--spacing-touch-min` is the 44px floor, carried to the
 * primitives by `--_touch-min` on a touch screen (a primary pointer that cannot hover)
 * only. Visible controls grow to it; small indicators keep their box and extend an
 * invisible `::after` hit area; `--spacing-min` takes a tenth of it.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { commands, server } from "vite-plus/test/browser/context";
import { lengthPx, mount, style, useCss, useKit } from "../../test/browser.ts";

const held = commands as unknown as { emulateTouch(enabled: boolean): Promise<void> };
const px = (value: string) => Number.parseFloat(value);
const box = (el: Element) => el.getBoundingClientRect();

/** The element a tap at (x, y) lands on. A pseudo-element hit-tests as its host. */
const tapped = (x: number, y: number) => document.elementFromPoint(x, y);

/** The floor in px, set directly on :root the way _variables.css sets it on a touch screen;
 * `floor` overrides the token so a hit area is measurably larger than the control. */
function withTouchFloor(floor?: number): number {
  const root = document.documentElement.style;
  if (floor !== undefined) root.setProperty("--spacing-touch-min", `${floor}px`);
  root.setProperty("--_touch-min", "var(--spacing-touch-min)");
  return lengthPx("var(--spacing-touch-min)");
}

describe("touch targets", () => {
  useKit();
  useCss(`* { transition: none !important; }`);
  afterEach(() => document.documentElement.removeAttribute("style"));

  it("--spacing-touch-min is 44px and --_touch-min is 0 on a pointer that hovers", () => {
    expect(lengthPx("var(--spacing-touch-min)")).toBe(44);
    expect(lengthPx("var(--_touch-min)")).toBe(0);
    expect(lengthPx("var(--spacing-min)")).toBeCloseTo(16 * 0.225, 1);
  });

  // Touch emulation is a CDP session: Chromium only.
  it.skipIf(server.browser !== "chromium")(
    "a primary pointer that cannot hover turns the floor on and loosens --spacing-min by a tenth of it",
    async () => {
      await held.emulateTouch(true);
      try {
        expect(matchMedia("(hover: hover)").matches).toBe(false);
        expect(lengthPx("var(--_touch-min)")).toBe(44);
        expect(lengthPx("var(--spacing-min)")).toBeCloseTo(16 * 0.225 + 44 / 80, 1);
        const button = mount(`<button data-ui="button">Save</button>`);
        expect(box(button).height).toBeGreaterThanOrEqual(44);
      } finally {
        await held.emulateTouch(false);
      }
      expect(lengthPx("var(--_touch-min)")).toBe(0);
    },
  );

  it("visible controls grow to the floor; link and sm buttons keep their box", () => {
    const floor = withTouchFloor();
    const root = mount(`<div style="--display: grid; --gap: 12; --justify-items: start">
      <button data-ui="button" data-default>Save</button>
      <button data-ui="button" data-button-size="icon" data-icon><svg></svg></button>
      <button data-ui="button" data-button-variant="link" data-link>Learn more</button>
      <button data-ui="button" data-button-size="sm" data-sm>Small</button>
      <input data-ui="input" data-input />
      <select data-ui="select" data-select><option>One</option></select>
      <label data-ui="toggle" data-toggle><input type="checkbox" />Bold</label>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(box(at("[data-default]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-icon]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-icon]")).width).toBeCloseTo(box(at("[data-icon]")).height, 0);
    expect(box(at("[data-link]")).height).toBeLessThan(floor);
    expect(box(at("[data-sm]")).height).toBeLessThan(floor);
    expect(box(at("[data-input]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-select]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-toggle]")).height).toBeGreaterThanOrEqual(floor);
  });

  it("a sm button keeps its box but a tap just outside it still lands on it", () => {
    const floor = withTouchFloor(44);
    const root = mount(`<div style="--p: 16">
      <button data-ui="button" data-button-size="sm">Small</button>
    </div>`);
    const button = root.querySelector("button")!;
    const b = box(button);
    expect(b.height).toBeLessThan(floor);
    // the inset resolves against the padding box, so the border adds to the floor
    const hit = b.height - 2 * px(style(button, "inset-block-start", "::after"));
    expect(hit).toBeGreaterThanOrEqual(floor);
    expect(hit).toBeLessThan(floor + 3);
    const reach = (hit - b.height) / 2 - 2;
    expect(reach).toBeGreaterThan(0);
    expect(tapped(b.left + b.width / 2, b.top - reach)).toBe(button);
    expect(tapped(b.left + b.width / 2, b.bottom + reach)).toBe(button);
  });

  it("checkbox, radio and switch keep their size and gain a hit area at the floor", () => {
    const floor = withTouchFloor(44);
    const root = mount(`<div style="--display: grid; --gap: 16; --p: 16; --justify-items: start">
      <input type="checkbox" data-checkbox />
      <input type="radio" data-ui="radio" data-radio />
      <label data-switch-label><input type="checkbox" role="switch" data-switch /></label>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    for (const selector of ["[data-checkbox]", "[data-radio]", "[data-switch]"]) {
      const el = at(selector);
      const b = box(el);
      expect(b.height, selector).toBeLessThan(floor);
      // the ::after is inset by half the shortfall on each side (measured against the
      // padding box, so the border adds to the floor): the hit area spans at least the floor
      const hit = b.height - 2 * px(style(el, "inset-block-start", "::after"));
      expect(hit, selector).toBeGreaterThanOrEqual(floor);
      expect(hit, selector).toBeLessThan(floor + 3);
      // just inside the hit area's edge is outside the box but still lands on the control
      const reach = (hit - b.height) / 2 - 2;
      expect(reach, selector).toBeGreaterThan(0);
      expect(tapped(b.left + b.width / 2, b.top - reach), selector).toBe(el);
      expect(tapped(b.left + b.width / 2, b.bottom + reach), selector).toBe(el);
    }
  });

  it("without the floor the hit area collapses to the control's own box", () => {
    const root = mount(`<div style="--p: 16"><input type="checkbox" /></div>`);
    const el = root.querySelector("input")!;
    const b = box(el);
    expect(px(style(el, "inset-block-start", "::after"))).toBe(0);
    expect(tapped(b.left + b.width / 2, b.top - 12)).not.toBe(el);
  });
});
