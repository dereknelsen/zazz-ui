"use strict";

/**
 * @fileoverview The switch: the track takes its width from the hook
 * or a dual-mode `--w` utility, fills when checked, and publishes its focus ring.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { lengthPx, mount, scale, style, tabTo, useCss, useKit } from "../../../test/browser.ts";

describe("switch", () => {
  useKit();
  useCss(`input, label::after { transition: none; }`);

  it("sizes the track from the hook or a --w utility and fills when checked", () => {
    const root = mount(`<div>
      <label><input type="checkbox" role="switch" data-default /></label>
      <label><input type="checkbox" role="switch" data-utility style="--w: 12" /></label>
      <label><input type="checkbox" role="switch" data-checked checked /></label>
      <div data-primary style="--bg: var(--color-primary)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "inline-size"))).toBeCloseTo(
      lengthPx("var(--ui-switch-track-w)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "inline-size"))).toBeCloseTo(scale(12), 1);
    expect(style(at("[data-checked]"), "background-color")).toBe(
      style(at("[data-primary]"), "background-color"),
    );
  });

  const thumb = (label: Element, property: string) =>
    getComputedStyle(label, "::after").getPropertyValue(property);

  it("rounds the track and thumb by default", () => {
    const root = mount(`<label><input type="checkbox" role="switch" /></label>`);
    const full = `${lengthPx("var(--radius-full)")}px`;
    expect(style(root.querySelector("input")!, "border-start-start-radius")).toBe(full);
    expect(thumb(root, "border-start-start-radius")).toBe(full);
  });

  describe("with --ui-switch-radius set on :root", () => {
    useCss(`:root { --ui-switch-radius: 3px; }`);

    it("re-skins the track and thumb together", () => {
      const root = mount(`<label><input type="checkbox" role="switch" /></label>`);
      expect(style(root.querySelector("input")!, "border-start-start-radius")).toBe("3px");
      expect(thumb(root, "border-start-start-radius")).toBe("3px");
    });
  });

  it("takes a scale number or a length on the track and thumb radius hooks", () => {
    const root = mount(
      `<label style="--ui-switch-track-radius: 4px; --ui-switch-thumb-radius: 2"><input type="checkbox" role="switch" /></label>`,
    );
    expect(style(root.querySelector("input")!, "border-start-start-radius")).toBe("4px");
    expect(Number.parseFloat(thumb(root, "border-start-start-radius"))).toBeCloseTo(scale(2), 1);
  });

  it("a --radius utility shapes the track", () => {
    const root = mount(
      `<label><input type="checkbox" role="switch" style="--radius: 1" /></label>`,
    );
    expect(
      Number.parseFloat(style(root.querySelector("input")!, "border-start-start-radius")),
    ).toBeCloseTo(scale(1), 1);
  });

  it("borders the track from the hooks, matching the fill when checked", () => {
    const root = mount(`<div>
      <label><input type="checkbox" role="switch" data-off /></label>
      <label><input type="checkbox" role="switch" data-on checked /></label>
    </div>`);
    const off = root.querySelector("[data-off]")!;
    const on = root.querySelector("[data-on]")!;
    expect(style(off, "border-block-start-width")).toBe("1px");
    expect(style(off, "border-block-start-style")).toBe("solid");
    expect(style(on, "border-block-start-color")).toBe(style(on, "background-color"));
  });

  it.each(["light", "dark"])("keeps the track visible on hover (%s)", (theme) => {
    const root = mount(`<div data-theme="${theme}">
      <i data-rest style="background-color: var(--ui-switch-track-bg)"></i>
      <i data-hover style="background-color: var(--ui-switch-track-bg--hover)"></i>
    </div>`);
    const color = (selector: string) => style(root.querySelector(selector)!, "background-color");
    const alpha = (value: string) => Number(/\/ ([\d.]+)\)/.exec(value)?.[1] ?? 1);
    expect(color("[data-hover]")).not.toBe(color("[data-rest]"));
    expect(alpha(color("[data-hover]"))).toBeGreaterThan(0);
    expect(alpha(color("[data-hover]"))).toBeLessThan(0.5);
  });

  it("paints the checked thumb from its hook", () => {
    const root = mount(
      `<label style="--ui-switch-thumb-bg--checked: rgb(255, 0, 0)"><input type="checkbox" role="switch" checked /></label>`,
    );
    expect(thumb(root, "background-color")).toBe("rgb(255, 0, 0)");
  });

  it("swaps the track border on hover and focus", async () => {
    const root = mount(`<div>
      <label><input type="checkbox" role="switch" /></label>
      <span data-hover style="background-color: var(--ui-switch-track-border-color--hover)"></span>
      <span data-focus style="background-color: var(--ui-field-border-color--focus-within)"></span>
    </div>`);
    const el = root.querySelector("input")!;
    const swatch = (selector: string) => style(root.querySelector(selector)!, "background-color");
    await userEvent.hover(el);
    expect(style(el, "border-block-start-color")).toBe(swatch("[data-hover]"));
    await userEvent.unhover(el);
    await tabTo(el);
    expect(style(el, "border-block-start-color")).toBe(swatch("[data-focus]"));
  });

  it("takes a --cursor utility, and shows not-allowed while disabled", () => {
    const root = mount(`<div>
      <label><input type="checkbox" role="switch" data-default /></label>
      <label><input type="checkbox" role="switch" data-utility style="--cursor: help" /></label>
      <label><input type="checkbox" role="switch" data-disabled disabled /></label>
    </div>`);
    expect(style(root.querySelector("[data-default]")!, "cursor")).toBe("pointer");
    expect(style(root.querySelector("[data-utility]")!, "cursor")).toBe("help");
    expect(style(root.querySelector("[data-disabled]")!, "cursor")).toBe("not-allowed");
  });

  it("the focus ring survives a --shadow utility", async () => {
    const root = mount(
      `<label><input type="checkbox" role="switch" style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)" /></label>`,
    );
    const el = root.querySelector("input")!;
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
  });
});
