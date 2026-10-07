"use strict";

/**
 * @fileoverview `<ui-autocomplete>`: an input that suggests options as you type.
 * @description Light-DOM custom element on the shared typeahead engine
 * (`base/typeahead.ts`). The visible input is the form value (free text is
 * allowed) and the anchored `popover="manual"` panel suggests matches ranked
 * by the vendored cmdk scorer. Committing a suggestion (Enter or click) fills
 * the input; without JavaScript the markup degrades to a plain `[data-ui~="input"]`.
 *
 * Attributes on the root:
 * - `data-autocomplete-sort="score"`: re-rank visually by match score (default: DOM order).
 * - `data-autocomplete-filter="none"`: show every item; another source filters.
 * - `data-autocomplete-min-length="<n>"`: query length before the panel opens (default 0).
 *
 * Parts: `autocomplete-panel` (popover="manual"), `autocomplete-list`
 * ([role="listbox"]), `autocomplete-item` ([role="option"], `data-autocomplete-value`,
 * optional `data-autocomplete-keywords`), `autocomplete-group` / `autocomplete-group-label`,
 * `autocomplete-empty`.
 */

import { TypeaheadElement } from "../../base/typeahead.ts";
import { defineZazzElement } from "../../base/zazz-element.ts";

class UiAutocomplete extends TypeaheadElement {
  protected readonly slotPrefix = "autocomplete";

  /**
   * @description Committing a suggestion fills the visible input (which is
   * the form value), closes the panel, and returns to typing position.
   *
   * @param item - The committed option.
   */
  protected commit(item: HTMLElement, _source: "keyboard" | "pointer"): void {
    const input = this.searchInput;
    if (!input) return;
    input.value = this.itemValue(item);
    this.query.set(input.value);
    this.open.set(false);
    input.focus();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

defineZazzElement("ui-autocomplete", UiAutocomplete);

export { UiAutocomplete };
