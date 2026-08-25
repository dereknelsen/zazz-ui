"use strict";

/**
 * @fileoverview `<ui-combobox>` — an input restricted to a predefined list.
 * @description Light-DOM custom element on the shared typeahead engine
 * (`base/typeahead.ts`). A relative of select: the visible input filters the
 * anchored panel but can never submit free text. The form value lives in an
 * authored hidden input (`data-slot="combobox-value"`), synced on commit; on
 * blur, text that matches no committed choice reverts to the last committed
 * label, and cleared text clears the selection.
 *
 * Items match against their visible label; the machine value comes from
 * `data-value`. The committed item carries `aria-selected="true"` (styled
 * with the shared option checkmark). The chevron trigger toggles the full,
 * unfiltered list.
 *
 * Where a no-JS fallback matters, prefer `.ui-select` — this control is inert
 * without its script (the hidden input still submits a server-set value).
 *
 * Attributes on the root: `data-sort="score"`, `data-min-length="<n>"`.
 * Parts: `combobox-value` (hidden input), `combobox-control` (select-look
 * shell), `combobox-trigger` (chevron), `combobox-panel`, `combobox-list`,
 * `combobox-item`, `combobox-group` / `combobox-group-label`, `combobox-empty`.
 */

import { TypeaheadElement } from "../../base/typeahead.ts";
import { defineZazzElement } from "../../base/zazz-element.ts";

class UiCombobox extends TypeaheadElement {
  protected readonly slotPrefix = "combobox";

  #committedLabel = "";

  protected setup(signal: AbortSignal): void {
    super.setup(signal);
    const input = this.searchInput;
    if (!input) return;

    // Seed the committed state from markup (server-rendered selection)
    const selected = this.items().find((item) => item.getAttribute("aria-selected") === "true");
    if (selected) {
      this.#committedLabel = this.itemValue(selected);
      input.value ||= this.#committedLabel;
    }

    // Typing invalidates the committed value until the user re-commits
    input.addEventListener(
      "input",
      () => {
        const hidden = this.#valueInput();
        if (hidden && input.value !== this.#committedLabel) hidden.value = "";
      },
      { signal },
    );

    // Chevron toggles the full, unfiltered list
    const trigger = this.querySelector('[data-slot~="combobox-trigger"]');
    if (trigger instanceof HTMLElement) {
      trigger.addEventListener(
        "click",
        () => {
          if (this.open.get()) {
            this.open.set(false);
          } else {
            input.focus();
            this.query.set("");
            this.open.set(true);
          }
        },
        { signal },
      );
    }

    // No free text: on leaving, revert stray text or clear the selection
    this.addEventListener(
      "focusout",
      (event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && this.contains(next)) return;
        if (input.value === "") this.#clearSelection();
        else if (input.value !== this.#committedLabel) {
          input.value = this.#committedLabel;
          this.query.set(this.#committedLabel);
        }
      },
      { signal },
    );
  }

  /**
   * @description Combobox items match against what the user sees — the label —
   * not the machine `data-value`.
   *
   * @param item - The item element.
   * @returns The trimmed visible label.
   */
  protected itemValue(item: HTMLElement): string {
    return item.textContent?.trim() ?? "";
  }

  /**
   * @description Committing an item shows its label, stores its `data-value`
   * in the hidden input, and moves `aria-selected`.
   *
   * @param item - The committed option.
   */
  protected commit(item: HTMLElement, _source: "keyboard" | "pointer"): void {
    const input = this.searchInput;
    const hidden = this.#valueInput();
    if (!input) return;

    const label = this.itemValue(item);
    this.#committedLabel = label;
    input.value = label;
    this.query.set(label);
    if (hidden) {
      hidden.value = item.getAttribute("data-value") ?? label;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }
    for (const other of this.items()) other.removeAttribute("aria-selected");
    item.setAttribute("aria-selected", "true");
    this.open.set(false);
    input.focus();
  }

  /**
   * @description The authored hidden input carrying the form value.
   *
   * @returns The hidden input, or null when the author omitted it.
   * @private
   */
  #valueInput(): HTMLInputElement | null {
    const hidden = this.querySelector('[data-slot~="combobox-value"]');
    return hidden instanceof HTMLInputElement ? hidden : null;
  }

  /**
   * @description Empties the committed state: label, hidden value, and
   * `aria-selected` all clear together.
   * @private
   */
  #clearSelection(): void {
    this.#committedLabel = "";
    this.query.set("");
    const hidden = this.#valueInput();
    if (hidden && hidden.value !== "") {
      hidden.value = "";
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }
    for (const item of this.items()) item.removeAttribute("aria-selected");
  }
}

defineZazzElement("ui-combobox", UiCombobox);

export { UiCombobox };
