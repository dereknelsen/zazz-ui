"use strict";

/**
 * @fileoverview `<ui-tabs>`: HTML web component for keyboard-enhanced tabs.
 * @description Light-DOM custom element that augments the CSS-only radio
 * tabs pattern with orientation-aware arrow-key navigation.
 *
 * Keyboard behavior on the focused tab radio:
 * - Horizontal (default): ArrowLeft / ArrowRight move between tabs, following
 *   the writing direction (in RTL, ArrowLeft is the next tab).
 * - Vertical (`data-tabs-orientation="vertical"`): ArrowUp / ArrowDown move between tabs.
 * - Home / End jump to the first / last enabled tab.
 * - Navigation wraps around and skips disabled tabs.
 *
 * Native radio-group arrow keys already provide a baseline without
 * JavaScript; this element makes the keys match the tabs' visual
 * orientation and adds Home/End + wrap-around. The key handling is the shared
 * list navigation behavior (`behaviors/list-navigation.ts`).
 *
 * @example
 * <ui-tabs>
 *   <div data-tabs-slot="list" role="tablist">
 *     <input type="radio" role="tab" name="tg" id="tg-1" checked />
 *     <label for="tg-1" data-tabs-slot="label">One</label>
 *     <input type="radio" role="tab" name="tg" id="tg-2" />
 *     <label for="tg-2" data-tabs-slot="label">Two</label>
 *   </div>
 *   <div data-tabs-slot="panel">…</div>
 *   <div data-tabs-slot="panel">…</div>
 * </ui-tabs>
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";
import { isDisabledItem, listStep, stepIndex } from "../../behaviors/list-navigation.ts";

class UiTabs extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    this.addEventListener("keydown", (event) => this.#onKeydown(event), { signal });
  }

  /**
   * @description Handles arrow-key, Home, and End navigation between tab radios.
   *
   * @param event - The keydown event.
   */
  #onKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;

    const list = target.closest('[role="tablist"], [data-tabs-slot~="list"]');
    // ignore radios of a nested ui-tabs
    if (!list || list.closest('ui-tabs, [data-ui~="tabs"]') !== this) return;

    const vertical = this.getAttribute("data-tabs-orientation") === "vertical";
    const step = listStep(event.key, {
      orientation: vertical ? "vertical" : "horizontal",
      rtl: getComputedStyle(list).direction === "rtl",
    });
    if (!step) return;

    const tabs = Array.from(list.querySelectorAll('input[type="radio"]'))
      .filter((node): node is HTMLInputElement => node instanceof HTMLInputElement)
      .filter((tab) => !isDisabledItem(tab));
    if (tabs.length < 2) return;

    const index = tabs.indexOf(target);
    if (index === -1) return;

    event.preventDefault();

    const tab = tabs[stepIndex(index, step, tabs.length)];
    tab.checked = true;
    tab.focus();
    tab.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

defineZazzElement("ui-tabs", UiTabs);

export { UiTabs };
