"use strict";

/**
 * @fileoverview The input group: the shell wears the field surface,
 * `data-input-group-slot` addons order by `data-input-group-align`, and a
 * dual-mode `--gap` utility beats the hook.
 */

import { describe, expect, it } from "vite-plus/test";
import {
  lengthPx,
  mount,
  scale,
  settled,
  style,
  tabTo,
  useCss,
  useKit,
} from "../../../test/browser.ts";

const GROUP = (attrs = "") => `<label data-ui="input-group" ${attrs}>
    <span data-input-group-slot="addon" data-lead>@</span>
    <input data-ui="input" />
    <span data-input-group-slot="addon" data-input-group-align="inline-end" data-trail>.com</span>
  </label>`;

describe("input group", () => {
  useKit();
  useCss(`[data-ui~="input-group"], [data-ui~="input"] { transition: none; }`);

  it("orders addons by alignment and takes a --gap utility over the hook", () => {
    const root = mount(
      `<div>${GROUP("data-default")}${GROUP('data-utility style="--gap: 4"')}</div>`,
    );
    const plain = root.querySelector("[data-default]")!;
    expect(style(plain, "display")).toBe("flex");
    expect(style(plain.querySelector("[data-lead]")!, "order")).toBe("-1");
    expect(style(plain.querySelector("[data-trail]")!, "order")).toBe("1");
    expect(Number.parseFloat(style(plain, "column-gap"))).toBeCloseTo(
      lengthPx("var(--ui-input-group-gap)"),
      1,
    );
    expect(
      Number.parseFloat(style(root.querySelector("[data-utility]")!, "column-gap")),
    ).toBeCloseTo(scale(4), 1);
  });

  /** The height a nested part has when it sits --ui-field-inset-p inside the shell's border. */
  const inset = () => lengthPx("calc(var(--ui-field-h) - 2 * var(--ui-field-inset-p))");

  it("sizes a nested button to the field inset, with no size preset", () => {
    const root = mount(`<div>
      <label data-ui="input-group" data-shell>
        <input data-ui="input" name="q" />
        <span data-input-group-slot="addon" data-input-group-align="inline-end">
          <button data-ui="button" data-text type="button">Apply</button>
          <button data-ui="button" data-button-size="icon" data-icon type="button" aria-label="Go">
            <svg viewBox="0 0 16 16"></svg>
          </button>
        </span>
      </label>
      <label data-ui="input-group" data-empty><input data-ui="input" name="plain" /><span data-input-group-slot="addon" data-input-group-align="inline-end"><svg viewBox="0 0 16 16"></svg></span></label>
    </div>`);
    const text = root.querySelector<HTMLElement>("[data-text]")!.getBoundingClientRect();
    const icon = root.querySelector<HTMLElement>("[data-icon]")!.getBoundingClientRect();
    expect(text.height).toBeCloseTo(inset(), 0);
    expect(icon.height).toBeCloseTo(inset(), 0);
    expect(icon.width).toBeCloseTo(icon.height, 0);
    // the buttons fit the addon, so the group is as tall as one with an icon addon
    expect(root.querySelector("[data-shell]")!.getBoundingClientRect().height).toBeCloseTo(
      root.querySelector("[data-empty]")!.getBoundingClientRect().height,
      0,
    );
  });

  it("sizes a toggle in an addon like a button", () => {
    const shell = mount(`<label data-ui="input-group">
      <input data-ui="input" name="q" />
      <span data-input-group-slot="addon" data-input-group-align="inline-end">
        <label data-ui="toggle" data-toggle-size="icon"><input type="checkbox" name="case" aria-label="Match case" /><svg viewBox="0 0 16 16"></svg></label>
      </span>
    </label>`);
    const toggle = shell.querySelector('[data-ui="toggle"]')!.getBoundingClientRect();
    expect(toggle.height).toBeCloseTo(inset(), 0);
    expect(toggle.width).toBeCloseTo(toggle.height, 0);
  });

  it("leaves the buttons in a popover opened from an addon at their own size", () => {
    const root = mount(`<div>
      <label data-ui="input-group">
        <input data-ui="input" name="amount" />
        <span data-input-group-slot="addon" data-input-group-align="inline-end">
          <ui-menu>
            <button data-ui="button" type="button" popovertarget="unit-menu">USD</button>
            <div id="unit-menu" data-menu-slot="popover" popover="auto">
              <menu><li><button data-ui="button" data-item type="button">EUR</button></li></menu>
            </div>
          </ui-menu>
        </span>
      </label>
      <button data-ui="button" data-plain type="button">Plain</button>
    </div>`);
    const item = root.querySelector("[data-item]")!;
    const plain = root.querySelector("[data-plain]")!;
    for (const property of ["font-size", "padding-inline-start", "min-block-size", "position"]) {
      expect(style(item, property)).toBe(style(plain, property));
    }
    expect(getComputedStyle(item, "::after").content).not.toBe('""');
  });

  it("keeps a nested button inset on a touch screen and gives it a touch-sized hit area", () => {
    const root = document.documentElement.style;
    root.setProperty("--_touch-min", "var(--spacing-touch-min)");
    try {
      const shell = mount(`<label data-ui="input-group">
        <input data-ui="input" name="q" />
        <span data-input-group-slot="addon" data-input-group-align="inline-end">
          <button data-ui="button" data-button-size="icon" type="button" aria-label="Go">
            <svg viewBox="0 0 16 16"></svg>
          </button>
        </span>
      </label>`);
      const button = shell.querySelector<HTMLElement>("button")!;
      expect(button.getBoundingClientRect().height).toBeCloseTo(inset(), 0);
      const after = getComputedStyle(button, "::after");
      expect(after.content).toBe('""');
      expect(Number.parseFloat(after.height)).toBeGreaterThanOrEqual(
        lengthPx("var(--spacing-touch-min)") - 0.5,
      );
    } finally {
      root.removeProperty("--_touch-min");
    }
  });

  it("the shell's focus ring survives a --shadow utility", async () => {
    const shell = mount(GROUP('style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)"'));
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    await tabTo(shell.querySelector("input")!);
    await settled(shell);
    expect(style(shell, "box-shadow")).toContain(ring);
    expect(style(shell, "box-shadow")).toContain("0px 4px 8px");
  });
});
