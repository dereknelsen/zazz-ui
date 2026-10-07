"use strict";

/**
 * @fileoverview `<ui-command>`: a command menu for search and quick actions.
 * @description Light-DOM custom element on the shared typeahead engine
 * (`base/typeahead.ts`). The panel (a `popover="auto"`
 * dropdown or a `<dialog data-ui="dialog">`) contains the search input;
 * items rank by match score and the best match auto-highlights.
 *
 * Actions are the platform's own vocabulary: navigation items are real
 * `<a href>` links, and action items are `<button command commandfor>` invoker
 * buttons (including custom `--commands`). Enter activates the highlighted
 * item exactly as a click would; every activation also dispatches a bubbling
 * `zazz:command-select` CustomEvent (`detail: { item, value }`) from the root.
 * Without JavaScript the trigger still opens the panel natively and every
 * item still works: only filtering, highlight, and hotkeys are lost.
 *
 * Attributes:
 * - `data-command-hotkey` (root): global toggle shortcut, e.g. `"mod+k"`.
 * - `data-command-hotkey` (item): global accelerator that activates the item, active
 *   while the element is connected (even with the panel closed).
 * - `data-command-stay-open` (item): keep the panel open after activation.
 * - `data-command-sort="document"` (root): opt out of score ranking (default: score).
 * - `data-command-filter="none"` (root): opt out of filtering for a list another
 *   source already filtered (a search index); items added later are highlighted
 *   and navigable like typed matches.
 *
 * Parts: `command-open` (trigger), `command-panel`, `command-header`,
 * `command-input`, `command-list`, `command-group` / `command-group-label`,
 * `command-item` (`data-command-value`, `data-command-keywords`), `command-kbd`,
 * `command-footer`, `command-empty`.
 *
 * For complex custom actions, see the example `command-actions.ts`: listen
 * for your `--command` on its target, or for `zazz:command-select` on the root.
 */

import { TypeaheadElement } from "../../base/typeahead.ts";
import { bindHotkey } from "../../base/hotkeys.ts";
import { defineZazzElement } from "../../base/zazz-element.ts";

class UiCommand extends TypeaheadElement {
  protected readonly slotPrefix = "command";
  protected readonly managesPanel: boolean = false;
  protected readonly autoHighlight: boolean = true;

  /** Ranks by score unless `data-command-sort="document"`. */
  protected get sortByScore(): boolean {
    return this.config("sort") !== "document";
  }

  protected setup(signal: AbortSignal): void {
    super.setup(signal);
    const input = this.searchInput;
    const panel = this.panel;
    if (!input || !panel) return;

    // Global toggle shortcut on the root
    const toggleSpec = this.getAttribute("data-command-hotkey");
    if (toggleSpec) {
      bindHotkey(toggleSpec, () => this.#togglePanel(), { signal });
    }

    // Per-item accelerators: global while connected, panel open or not
    for (const item of this.items()) {
      const spec = item.getAttribute("data-command-hotkey");
      if (spec) {
        bindHotkey(spec, () => this.#activate(item, true), { signal });
      }
    }

    // Reset the search whenever the panel closes, so it reopens fresh
    const reset = (): void => {
      input.value = "";
      this.query.set("");
      this.activeIndex.set(0);
    };
    if (panel instanceof HTMLDialogElement) {
      this.addEventListener(
        "zazz:dialog-close",
        (event) => {
          if (event.target === panel) reset();
        },
        { signal },
      );
    } else {
      panel.addEventListener(
        "toggle",
        (event) => {
          if ((event as ToggleEvent).newState === "closed") reset();
        },
        { signal },
      );
    }
  }

  /**
   * @description A pointer commit has already run the item's native activation
   * (link navigation, invoker command); a keyboard commit runs it via
   * `click()`. Both announce `zazz:command-select` and close the panel unless
   * the item asks to stay open.
   *
   * @param item - The activated item.
   * @param source - How the commit happened.
   */
  protected commit(item: HTMLElement, source: "keyboard" | "pointer"): void {
    // The synthetic click() below bubbles back here as a pointer commit:
    // one keystroke must announce once and close once.
    if (this.#clicking) return;
    this.#activate(item, source === "keyboard");
  }

  /** True while `#activate` runs an item's native activation via `click()`. */
  #clicking = false;

  /**
   * @description Runs one item's activation: optional synthetic click,
   * `zazz:command-select`, then close (unless `data-command-stay-open`).
   *
   * @param item - The item to activate.
   * @param click - Whether to run the native activation via `click()`.
   * @private
   */
  #activate(item: HTMLElement, click: boolean): void {
    this.dispatchEvent(
      new CustomEvent("zazz:command-select", {
        bubbles: true,
        detail: { item, value: this.itemValue(item) },
      }),
    );
    if (click) {
      this.#clicking = true;
      try {
        item.click();
      } finally {
        this.#clicking = false;
      }
    }
    if (!item.hasAttribute("data-command-stay-open")) {
      this.#closePanel();
    }
  }

  /**
   * @description Opens or closes the panel, branching on its surface.
   * @private
   */
  #togglePanel(): void {
    const panel = this.panel;
    if (!panel) return;
    if (panel instanceof HTMLDialogElement) {
      if (panel.open) panel.close();
      else panel.showModal();
    } else {
      panel.togglePopover();
    }
  }

  /**
   * @description Closes the panel, branching on its surface.
   * @private
   */
  #closePanel(): void {
    const panel = this.panel;
    if (!panel) return;
    if (panel instanceof HTMLDialogElement) {
      if (panel.open) panel.close();
    } else if (panel.matches(":popover-open")) {
      panel.hidePopover();
    }
  }
}

defineZazzElement("ui-command", UiCommand);

export { UiCommand };
