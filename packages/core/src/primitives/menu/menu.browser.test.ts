"use strict";

/**
 * @fileoverview The menu: the panel slot takes the menu's width and
 * shadow hooks in tag and attribute form, nested buttons take the menu's
 * radius, and a dual-mode `--min-w` utility on the panel beats the hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

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
      <div data-radius style="--rounded: var(--ui-menu-button-rounded)"></div>
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
});
