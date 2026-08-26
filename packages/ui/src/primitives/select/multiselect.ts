"use strict";

/**
 * @fileoverview `<ui-multiselect>`: a multi-select styled as a dropdown.
 * @description Light-DOM custom element that progressively enhances a real
 * `<select multiple class="ui-select">`. `appearance: base-select` does not
 * yet apply to multi-selects in any stable engine, so the script hides the
 * select (which remains the form value carrier and source of truth) and
 * stamps a `.ui-select`-look trigger button plus an anchored popover of
 * checkbox rows projected from the options. Checkbox changes write back to
 * `option.selected` and re-dispatch `change` on the select; external writes
 * and form resets flow the other way. Without JavaScript the native
 * multi-select listbox renders: fully functional and accessible.
 *
 * The trigger reads `<first selection> (+N more)`. When base-select grows
 * stable multi-select support this enhancement can retire (see the CSS
 * header note in select.css).
 *
 * Attributes on `<ui-multiselect>`:
 * - `data-placeholder`: trigger text when nothing is selected.
 * - `data-label-more`: overflow template, default `"(+{n} more)"`.
 * - `data-side` / `data-align`: forwarded to the stamped panel (popover
 *   placement matrix).
 *
 * Stamped parts: `multiselect-trigger` (a `.ui-select`-classed button),
 * `multiselect-icon` (chevron), `multiselect-panel` (`[popover]`),
 * `multiselect-option` (label + checkbox per option).
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";
import { effect, state } from "../../base/signals.ts";

// --- Pure derivations (exported for unit tests only) ---

/**
 * @description Formats the trigger label from the selected option labels.
 *
 * @param labels - Labels of the selected options, in DOM order.
 * @param placeholder - Text for an empty selection.
 * @param moreTemplate - Overflow template; `{n}` is the remaining count.
 * @returns The trigger text.
 */
function resolveTriggerLabel(
  labels: readonly string[],
  placeholder: string,
  moreTemplate: string,
): string {
  if (labels.length === 0) return placeholder;
  if (labels.length === 1) return labels[0];
  return `${labels[0]} ${moreTemplate.replace("{n}", String(labels.length - 1))}`;
}

// --- Element ---

let multiselectIdCounter = 0;

class UiMultiselect extends ZazzElement {
  #stamped: HTMLElement[] = [];
  #select: HTMLSelectElement | null = null;

  protected setup(signal: AbortSignal): void {
    const select = this.querySelector("select[multiple]");
    if (!(select instanceof HTMLSelectElement)) return;
    this.#select = select;

    const placeholder = this.getAttribute("data-placeholder") ?? "Select…";
    const moreTemplate = this.getAttribute("data-label-more") ?? "(+{n} more)";

    const { trigger, label, panel, checkboxes } = this.#stamp(select);
    select.setAttribute("data-multiselect-enhanced", "");

    const selectedLabels = (): string[] =>
      Array.from(select.selectedOptions).map((option) => option.label);
    const selection = state(selectedLabels());

    // Checkbox → option: the select stays the source of truth
    checkboxes.forEach((checkbox, index) => {
      checkbox.addEventListener(
        "change",
        () => {
          const option = select.options[index];
          if (option) option.selected = checkbox.checked;
          selection.set(selectedLabels());
          select.dispatchEvent(new Event("change", { bubbles: true }));
        },
        { signal },
      );
    });

    // External writes and form resets → re-read (reset applies after the event)
    select.addEventListener("change", () => selection.set(selectedLabels()), { signal });
    select.form?.addEventListener(
      "reset",
      () => queueMicrotask(() => selection.set(selectedLabels())),
      { signal },
    );

    // The popover polyfill doesn't reflect expanded state: mirror it ourselves
    panel.addEventListener(
      "toggle",
      (event) => {
        trigger.setAttribute("aria-expanded", String((event as ToggleEvent).newState === "open"));
      },
      { signal },
    );

    // Output adapter: trigger label + row checked states together
    effect(
      () => {
        selection.get();
        label.textContent = resolveTriggerLabel(selectedLabels(), placeholder, moreTemplate);
        checkboxes.forEach((checkbox, index) => {
          const option = select.options[index];
          if (option && checkbox.checked !== option.selected) checkbox.checked = option.selected;
        });
      },
      { signal },
    );
  }

  protected teardown(): void {
    for (const node of this.#stamped) node.remove();
    this.#stamped = [];
    this.#select?.removeAttribute("data-multiselect-enhanced");
    this.#select = null;
  }

  /**
   * @description Builds the trigger button and checkbox panel from the
   * select's options and inserts them after it.
   *
   * @param select - The enhanced select.
   * @returns The stamped parts and the checkbox list (option order).
   * @private
   */
  #stamp(select: HTMLSelectElement): {
    trigger: HTMLButtonElement;
    label: HTMLElement;
    panel: HTMLElement;
    checkboxes: HTMLInputElement[];
  } {
    const panelId = `ui-multiselect-panel-${++multiselectIdCounter}`;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ui-select";
    trigger.setAttribute("data-slot", "multiselect-trigger");
    trigger.setAttribute("popovertarget", panelId);
    trigger.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.setAttribute("data-slot", "multiselect-label");
    const icon = document.createElement("span");
    icon.setAttribute("data-slot", "multiselect-icon");
    icon.setAttribute("aria-hidden", "true");
    trigger.append(label, icon);

    const panel = document.createElement("div");
    panel.id = panelId;
    panel.setAttribute("data-slot", "multiselect-panel");
    panel.setAttribute("popover", "auto");
    const side = this.getAttribute("data-side");
    const align = this.getAttribute("data-align");
    if (side) panel.setAttribute("data-side", side);
    if (align) panel.setAttribute("data-align", align);

    const checkboxes: HTMLInputElement[] = [];
    for (const option of Array.from(select.options)) {
      const row = document.createElement("label");
      row.setAttribute("data-slot", "multiselect-option");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = option.selected;
      checkbox.disabled = option.disabled;
      row.append(checkbox, document.createTextNode(option.label));
      panel.append(row);
      checkboxes.push(checkbox);
    }

    select.after(trigger, panel);
    this.#stamped = [trigger, panel];
    return { trigger, label, panel, checkboxes };
  }
}

defineZazzElement("ui-multiselect", UiMultiselect);

export { UiMultiselect, resolveTriggerLabel };
