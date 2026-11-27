"use strict";

/**
 * @fileoverview The menu: the panel slot takes the menu's width and
 * shadow hooks in tag and attribute form, nested buttons take the menu's
 * radius, a dual-mode `--min-w` utility on the panel beats the hook, and the
 * arrow keys skip disabled items.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";
import "./menu.ts";

const MENU = (
  id: string,
  attrs = "",
) => `<button data-ui="button" type="button" popovertarget="${id}">Open</button>
  <div id="${id}" data-menu-slot="popover" popover="auto" ${attrs}><menu><li><a href="#" data-ui="button" data-button-variant="ghost">Item</a></li></menu></div>`;

describe("menu", () => {
  useKit();

  it("sizes the panel and rounds nested buttons from the menu hooks in both forms", () => {
    const root = mount(`<div>
      <ui-menu data-tag>${MENU("a")}</ui-menu>
      <nav data-ui="menu" data-attr>${MENU("b")}</nav>
      <div data-radius style="--radius: var(--ui-menu-button-radius)"></div>
    </div>`);
    const minWidth = lengthPx("var(--ui-menu-min-w)");
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const panel = root.querySelector(`${selector} [data-menu-slot='popover']`) as HTMLElement;
      panel.showPopover();
      expect(Number.parseFloat(style(panel, "min-inline-size")), selector).toBeCloseTo(minWidth, 1);
      expect(style(panel.querySelector("[data-ui~='button']")!, "border-radius"), selector).toBe(
        style(root.querySelector("[data-radius]")!, "border-radius"),
      );
      panel.hidePopover();
    }
  });

  it("a scale-number --min-w on the panel beats the hook", () => {
    const root = mount(`<ui-menu>${MENU("c", 'style="--min-w: 60"')}</ui-menu>`);
    const panel = root.querySelector("[data-menu-slot='popover']") as HTMLElement;
    panel.showPopover();
    expect(Number.parseFloat(style(panel, "min-inline-size"))).toBeCloseTo(scale(60), 1);
    panel.hidePopover();
  });

  it("the arrow keys skip a disabled button, an aria-disabled link, and a button in a disabled fieldset", () => {
    const root = mount(`<ui-menu><button type="button" popovertarget="k">Open</button>
      <div id="k" data-menu-slot="popover" popover="auto"><menu>
        <li><button type="button" data-first>One</button></li>
        <li><button type="button" disabled>Off</button></li>
        <li><a href="#" aria-disabled="true">Off</a></li>
        <li><fieldset disabled><button type="button">Off</button></fieldset></li>
        <li><button type="button" data-last>Two</button></li>
      </menu></div></ui-menu>`);
    const panel = root.querySelector<HTMLElement>("[data-menu-slot='popover']")!;
    const first = root.querySelector<HTMLElement>("[data-first]")!;
    const last = root.querySelector<HTMLElement>("[data-last]")!;
    const press = (key: string) =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    panel.showPopover();
    first.focus();
    press("ArrowDown");
    expect(document.activeElement, "down skips to the next enabled item").toBe(last);
    press("ArrowDown");
    expect(document.activeElement, "down wraps").toBe(first);
    press("ArrowUp");
    expect(document.activeElement, "up wraps past the disabled items").toBe(last);
    panel.hidePopover();
  });
});
