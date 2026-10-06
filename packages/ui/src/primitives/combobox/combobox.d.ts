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
declare class UiCombobox extends TypeaheadElement {
  #private;
  protected readonly slotPrefix = "combobox";
  protected setup(signal: AbortSignal): void;
  /**
   * @description Combobox items match against what the user sees — the label —
   * not the machine `data-value`.
   *
   * @param item - The item element.
   * @returns The trimmed visible label.
   */
  protected itemValue(item: HTMLElement): string;
  /**
   * @description Committing an item shows its label, stores its `data-value`
   * in the hidden input, and moves `aria-selected`.
   *
   * @param item - The committed option.
   */
  protected commit(item: HTMLElement, _source: "keyboard" | "pointer"): void;
}
export { UiCombobox };
//# sourceMappingURL=combobox.d.ts.map
