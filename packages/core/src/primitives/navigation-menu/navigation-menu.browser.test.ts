"use strict";

/**
 * @fileoverview The navigation menu: slots are `data-navigation-menu-slot`,
 * the panel takes the menu's width hook, the screen size spans the root, and
 * the trigger's chevron flips while its panel is open.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const NAV = (id: string, attrs = "") => `<menu data-navigation-menu-slot="list">
    <li data-navigation-menu-slot="item">
      <button data-ui="button" data-navigation-menu-slot="trigger" type="button" popovertarget="${id}">P<svg></svg></button>
      <div id="${id}" data-navigation-menu-slot="popover" popover="auto" ${attrs}>
        <div data-navigation-menu-slot="viewport"><a href="#" data-navigation-menu-slot="link">L</a></div>
      </div>
    </li>
  </menu>`;

describe("navigation menu", () => {
  useKit();
  useCss(`[popover], svg { transition: none; }`);

  it("sizes the panel from the width hook and flips the chevron while open", () => {
    const root = mount(`<nav data-ui="navigation-menu">${NAV("a")}</nav>`);
    const panel = root.querySelector("[data-navigation-menu-slot='popover']") as HTMLElement;
    const chevron = root.querySelector("[data-navigation-menu-slot='trigger'] > svg")!;
    expect(style(chevron, "transform")).toBe("none");
    panel.showPopover();
    expect(style(chevron, "transform")).not.toBe("none");
    // The hook is a min() with a percentage, so compare boxes: a fixed probe of
    // the hook's width against a panel whose content is wider than the hook.
    const probe = document.createElement("div");
    probe.style.cssText = "position: fixed; inline-size: var(--ui-navigation-menu-popover-w)";
    document.body.append(probe);
    panel.querySelector("[data-navigation-menu-slot='link']")!.textContent = "x".repeat(400);
    expect(panel.getBoundingClientRect().width).toBeCloseTo(probe.getBoundingClientRect().width, 0);
    probe.remove();
    panel.hidePopover();
  });

  it("the screen size spans the root", () => {
    const root = mount(
      `<nav data-ui="navigation-menu">${NAV("b", 'data-navigation-menu-size="screen"')}</nav>`,
    );
    const panel = root.querySelector("[data-navigation-menu-slot='popover']") as HTMLElement;
    panel.showPopover();
    expect(Number.parseFloat(style(panel, "inline-size"))).toBeCloseTo(window.innerWidth, 0);
    panel.hidePopover();
  });
});
