"use strict";

/**
 * @fileoverview `<ui-menu>`: HTML web component for keyboard-enhanced menus.
 * @description Light-DOM custom element that augments the CSS-only menu
 * pattern (trigger + anchored `[data-menu-slot~="popover"]` panel) with
 * arrow-key navigation. The attribute form `[data-ui~="menu"]` stays fully functional
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
 * The key handling is the shared list navigation behavior
 * (`behaviors/list-navigation.ts`).
 *
 * The menu keeps the honest disclosure posture: items are plain links and
 * buttons, and no `role="menu"` is claimed. Add the full ARIA menu contract
 * yourself only if every item is an action and you implement the rest of the
 * pattern (typeahead, close-on-activate).
 *
 * @example
 * <ui-menu>
 *   <button data-ui="button" type="button" popovertarget="m1">Open</button>
 *   <div id="m1" data-menu-slot="popover" popover="auto">
 *     <menu>
 *       <li><a href="/docs" data-ui="button" data-button-variant="ghost" style="--justify: start">Docs</a></li>
 *     </menu>
 *   </div>
 * </ui-menu>
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";
import { isDisabledItem, listStep, stepIndex } from "../../behaviors/list-navigation.ts";

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
    const panel = this.querySelector(':scope > [data-menu-slot~="popover"]');
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
        (item) => !isDisabledItem(item) && item.closest('ui-menu, [data-ui~="menu"]') === this,
      );
  }

  /**
   * @description Routes arrow-key, Home, and End presses: opens the panel from
   * the trigger, or moves focus between items inside the open panel.
   *
   * @param event - The keydown event.
   */
  #onKeydown(event: KeyboardEvent): void {
    const step = listStep(event.key);
    if (!step) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    // Ignore keys that belong to a nested ui-menu
    if (target.closest('ui-menu, [data-ui~="menu"]') !== this) return;

    const panel = this.#panel();
    if (!panel) return;

    const isTrigger =
      target.parentElement === this &&
      (target.hasAttribute("popovertarget") || target.hasAttribute("interestfor"));
    const open = panel.matches(":popover-open");

    if (isTrigger && !open && (step === "next" || step === "previous")) {
      event.preventDefault();
      panel.showPopover();
      const items = this.#items(panel);
      items[stepIndex(-1, step, items.length)]?.focus();
      return;
    }

    if (!open || !panel.contains(target)) return;

    const items = this.#items(panel);
    if (items.length === 0) return;

    event.preventDefault();
    items[stepIndex(items.indexOf(target), step, items.length)].focus();
  }
}

defineZazzElement("ui-menu", UiMenu);

export { UiMenu };
