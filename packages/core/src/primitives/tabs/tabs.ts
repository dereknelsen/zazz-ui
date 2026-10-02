"use strict";

/**
 * @fileoverview `<ui-tabs>`: HTML web component for keyboard-enhanced tabs.
 * @description Light-DOM custom element that augments the CSS-only radio
 * tabs pattern with orientation-aware arrow-key navigation.
 *
 * Keyboard behavior on the focused tab radio:
 * - Horizontal (default): ArrowLeft / ArrowRight move between tabs.
 * - Vertical (`data-tabs-orientation="vertical"`): ArrowUp / ArrowDown move between tabs.
 * - Home / End jump to the first / last enabled tab.
 * - Navigation wraps around and skips disabled tabs.
 *
 * Native radio-group arrow keys already provide a baseline without
 * JavaScript; this element makes the keys match the tabs' visual
 * orientation and adds Home/End + wrap-around.
 *
 * @example
 * <ui-tabs class="tabs">
 *   <div data-tabs-slot="list" role="tablist">
 *     <label data-tabs-slot="label"><input type="radio" name="tg" checked />One</label>
 *     <label data-tabs-slot="label"><input type="radio" name="tg" />Two</label>
 *   </div>
 *   <div data-tabs-slot="panel">…</div>
 *   <div data-tabs-slot="panel">…</div>
 * </ui-tabs>
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";

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

    const tabs = Array.from(list.querySelectorAll('input[type="radio"]'))
      .filter((node): node is HTMLInputElement => node instanceof HTMLInputElement)
      .filter((tab) => !tab.disabled);
    if (tabs.length < 2) return;

    const vertical =
      (this.getAttribute("data-tabs-orientation") ?? this.getAttribute("data-orientation")) ===
      "vertical";
    const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";

    const index = tabs.indexOf(target);
    if (index === -1) return;

    let nextIndex: number;
    switch (event.key) {
      case prevKey:
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case nextKey:
        nextIndex = (index + 1) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();

    const tab = tabs[nextIndex];
    tab.checked = true;
    tab.focus();
    tab.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

defineZazzElement("ui-tabs", UiTabs);

export { UiTabs };
