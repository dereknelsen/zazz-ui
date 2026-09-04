"use strict";

/**
 * @fileoverview `<ui-menu>`: HTML web component for keyboard-enhanced menus.
 * @description Light-DOM custom element that augments the CSS-only menu
 * pattern (trigger + anchored `[data-slot~="menu-popover"]` panel) with
 * arrow-key navigation. The class form `.ui-menu` stays fully functional
 * without JavaScript: the Popover API provides open/close, light dismiss,
 * and focus return on its own.
 *
 * Keyboard behavior:
 * - ArrowDown / ArrowUp on the closed trigger open the panel and focus the
 *   first / last item.
 * - ArrowDown / ArrowUp inside the open panel move focus between items,
 *   wrapping around and skipping disabled items.
 * - Home / End jump to the first / last item.
 * - Escape and light dismiss are native Popover API behavior (no code here).
 *
 * The menu keeps the honest disclosure posture: items are plain links and
 * buttons, and no `role="menu"` is claimed. Add the full ARIA menu contract
 * yourself only if every item is an action and you implement the rest of the
 * pattern (typeahead, close-on-activate).
 *
 * @example
 * <ui-menu>
 *   <button class="ui-button" type="button" popovertarget="m1">Open</button>
 *   <div id="m1" data-slot="menu-popover" popover="auto">
 *     <menu>
 *       <li><a href="/docs" class="ui-button justify-start" data-variant="ghost">Docs</a></li>
 *     </menu>
 *   </div>
 * </ui-menu>
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";

class UiMenu extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    this.addEventListener("keydown", (event) => this.#onKeydown(event), { signal });
  }

  /**
   * @description The menu's own panel: a direct child so nested menus keep
   * their panels to themselves.
   *
   * @returns The panel element, or null when the markup is incomplete.
   */
  #panel(): HTMLElement | null {
    const panel = this.querySelector(':scope > [data-slot~="menu-popover"]');
    return panel instanceof HTMLElement ? panel : null;
  }

  /**
   * @description Focusable items inside the panel, in DOM order.
   *
   * @param panel - The menu panel.
   * @returns Enabled links and buttons the arrow keys move between.
   */
  #items(panel: HTMLElement): HTMLElement[] {
    return Array.from(panel.querySelectorAll("a[href], button"))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter(
        (item) =>
          !item.hasAttribute("disabled") &&
          item.getAttribute("aria-disabled") !== "true" &&
          item.closest("ui-menu, .ui-menu") === this,
      );
  }

  /**
   * @description Routes arrow-key, Home, and End presses: opens the panel from
   * the trigger, or moves focus between items inside the open panel.
   *
   * @param event - The keydown event.
   */
  #onKeydown(event: KeyboardEvent): void {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    // Ignore keys that belong to a nested ui-menu
    if (target.closest("ui-menu") !== this) return;

    const panel = this.#panel();
    if (!panel) return;

    const isTrigger =
      target.parentElement === this &&
      (target.hasAttribute("popovertarget") || target.hasAttribute("interestfor"));
    const open = panel.matches(":popover-open");

    if (isTrigger && !open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      panel.showPopover();
      const items = this.#items(panel);
      items[event.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
      return;
    }

    if (!open || !panel.contains(target)) return;

    const items = this.#items(panel);
    if (items.length === 0) return;

    const index = items.indexOf(target);
    let nextIndex: number;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = index === -1 ? 0 : (index + 1) % items.length;
        break;
      case "ArrowUp":
        nextIndex = index === -1 ? items.length - 1 : (index - 1 + items.length) % items.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    items[nextIndex].focus();
  }
}

defineZazzElement("ui-menu", UiMenu);

export { UiMenu };
