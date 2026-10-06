/**
 * @fileoverview `<ui-multiselect>` — a multi-select styled as a dropdown.
 * @description Light-DOM custom element that progressively enhances a real
 * `<select multiple class="ui-select">`. `appearance: base-select` does not
 * yet apply to multi-selects in any stable engine, so the script hides the
 * select (which remains the form value carrier and source of truth) and
 * stamps a `.ui-select`-look trigger button plus an anchored popover of
 * checkbox rows projected from the options. Checkbox changes write back to
 * `option.selected` and re-dispatch `change` on the select; external writes
 * and form resets flow the other way. Without JavaScript the native
 * multi-select listbox renders — fully functional and accessible.
 *
 * The trigger reads `<first selection> (+N more)`. When base-select grows
 * stable multi-select support this enhancement can retire (see the CSS
 * header note in select.css).
 *
 * Attributes on `<ui-multiselect>`:
 * - `data-placeholder` — trigger text when nothing is selected.
 * - `data-label-more` — overflow template, default `"(+{n} more)"`.
 * - `data-side` / `data-align` — forwarded to the stamped panel (popover
 *   placement matrix).
 *
 * Stamped parts: `multiselect-trigger` (a `.ui-select`-classed button),
 * `multiselect-icon` (chevron), `multiselect-panel` (`[popover]`),
 * `multiselect-option` (label + checkbox per option).
 */
import { ZazzElement } from "../../base/zazz-element.ts";
/**
 * @description Formats the trigger label from the selected option labels.
 *
 * @param labels - Labels of the selected options, in DOM order.
 * @param placeholder - Text for an empty selection.
 * @param moreTemplate - Overflow template; `{n}` is the remaining count.
 * @returns The trigger text.
 */
declare function resolveTriggerLabel(
  labels: readonly string[],
  placeholder: string,
  moreTemplate: string,
): string;
declare class UiMultiselect extends ZazzElement {
  #private;
  protected setup(signal: AbortSignal): void;
  protected teardown(): void;
}
export { UiMultiselect, resolveTriggerLabel };
//# sourceMappingURL=multiselect.d.ts.map
