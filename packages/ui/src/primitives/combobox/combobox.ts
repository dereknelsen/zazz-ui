"use strict";

/**
 * @fileoverview `<ui-combobox>` — an input restricted to a predefined list.
 * @description Light-DOM custom element on the shared typeahead engine
 * (`base/typeahead.ts`). A relative of select: the panel filters as you type,
 * but free text can never submit. The form value lives in an authored hidden
 * input (`data-slot="combobox-value"`), synced whenever the selection changes.
 *
 * The visible input carries a **display value, not the filter**. Committing
 * writes the option's label into it and clears the query, so reopening shows
 * the full list with the committed row ticked — exactly like `.ui-select`.
 * Opening selects that label so the first keystroke replaces it, and focus
 * alone never opens the panel (a click, the chevron, an arrow key or typing
 * does). On blur, stray text reverts to the committed label and cleared text
 * clears the selection.
 *
 * `data-variant="multiselect"` selects a set instead: committing toggles a row
 * and keeps the panel open, and every selected value renders as a removable
 * tag stamped inside the control. The tag's markup is HTML, not script — author
 * a `<template data-slot="combobox-tag-template">` to control its classes and
 * structure, and this file fills in the label, the value, and the remove
 * button's accessible name. Without one, the ui-badge default below applies.
 * Backspace on an empty input drops the last tag. Options carrying
 * `aria-selected="true"`
 * are the single source of truth — the tags and the hidden inputs are both
 * derived from them in DOM order, so nothing can drift. The form submits
 * repeated `name` pairs like `<select multiple>`: the authored hidden input
 * carries the first value, stamped siblings the rest.
 *
 * Where a no-JS fallback matters, prefer `.ui-select` / `<ui-multiselect>` —
 * this control is inert without its script (the hidden input still submits a
 * server-set value, but no tags render).
 *
 * Attributes on the root: `data-variant="multiselect"`, `data-sort="score"`,
 * `data-min-length="<n>"`, `data-label-remove="Remove {label}"`.
 * Parts: `combobox-value` (hidden input), `combobox-control` (select-look
 * shell), `combobox-tag-template` (authored `<template>`), `combobox-tag` /
 * `combobox-tag-label` / `combobox-tag-remove` (cloned from it),
 * `combobox-trigger` (chevron), `combobox-panel`, `combobox-list`,
 * `combobox-item`, `combobox-group` / `combobox-group-label`, `combobox-empty`.
 */

import { TypeaheadElement } from "../../base/typeahead.ts";
import { defineZazzElement } from "../../base/zazz-element.ts";

// --- Tag blueprint ---

/**
 * The default tag markup, cloned once per selected value. Authors override it
 * wholesale with a `<template data-slot="combobox-tag-template">`, so restyling
 * a tag — other classes, an extra icon, a different component entirely — never
 * means editing this script. Kept as markup rather than createElement calls so
 * the default reads the same way the override is written.
 */
const TAG_MARKUP =
  '<span class="ui-badge" data-slot="combobox-tag">' +
  '<span data-slot="combobox-tag-label"></span>' +
  '<button type="button" tabindex="-1" data-slot="combobox-tag-remove"></button>' +
  "</span>";

let defaultTagTemplate: HTMLTemplateElement | null = null;

/**
 * @description Parses `TAG_MARKUP` once and shares the result.
 *
 * @returns The fallback tag template.
 * @private
 */
function defaultTagBlueprint(): HTMLTemplateElement {
  if (!defaultTagTemplate) {
    defaultTagTemplate = document.createElement("template");
    defaultTagTemplate.innerHTML = TAG_MARKUP;
  }
  return defaultTagTemplate;
}

// --- Pure derivations ---

/** What a blur does to the input's text and to the committed selection. */
interface BlurOutcome {
  /** The text the input shows once focus has left. */
  value: string;
  /** Whether the committed selection is dropped. */
  clear: boolean;
}

/**
 * @description Resolves a blur: free text never survives it. The multiselect
 * variant always empties the filter (its selection lives in the tags), the
 * single variant restores the committed label, and an emptied single-select
 * input clears the selection outright.
 *
 * @param typed - The input's current text.
 * @param committedLabel - The last committed label, empty for no selection.
 * @param multiselect - Whether the multiselect variant is active.
 * @returns The text to show and whether to clear the selection.
 */
function resolveBlur(typed: string, committedLabel: string, multiselect: boolean): BlurOutcome {
  if (multiselect) return { value: "", clear: false };
  if (typed === "") return { value: "", clear: true };
  return { value: committedLabel, clear: false };
}

/**
 * @description Fills the remove-button label template (`data-label-remove`).
 *
 * @param template - Template with a `{label}` placeholder.
 * @param label - The tag's visible label.
 * @returns The accessible name for that tag's remove button.
 */
function resolveRemoveLabel(template: string, label: string): string {
  return template.replace("{label}", label);
}

// --- Element ---

class UiCombobox extends TypeaheadElement {
  protected readonly slotPrefix = "combobox";
  /** The input holds a committed label, so focus alone must not open the list. */
  protected readonly openOnFocus: boolean = false;

  #committedLabel = "";
  #placeholder = "";
  #defaultValues: string[] = [];
  #serialized = "";

  protected setup(signal: AbortSignal): void {
    super.setup(signal);
    const input = this.searchInput;
    if (!input) return;
    const multiselect = this.#multiselect();
    this.#placeholder = input.getAttribute("placeholder") ?? "";

    if (multiselect) {
      this.querySelector('[data-slot~="combobox-list"]')?.setAttribute(
        "aria-multiselectable",
        "true",
      );
    }

    // Adopt a server-rendered value no row claims yet, so `value` alone is
    // enough markup to seed the selection — and so the sync below can never
    // silently discard it
    const hidden = this.#valueInput();
    if (hidden !== null && hidden.value !== "" && this.#selectedItems().length === 0) {
      const match = this.items().find((item) => this.#itemFormValue(item) === hidden.value);
      match?.setAttribute("aria-selected", "true");
    }

    // A multi-select listbox announces every row's state, not just the picked ones
    if (multiselect) {
      for (const item of this.items()) {
        if (item.getAttribute("aria-selected") !== "true") {
          item.setAttribute("aria-selected", "false");
        }
      }
    }

    // Attribute state has no defaultValue — remember the markup's selection so
    // a form reset can restore it
    this.#defaultValues = this.#selectedItems().map((item) => this.#itemFormValue(item));
    this.#committedLabel = multiselect ? "" : (this.#selectedLabel() ?? "");
    input.value = this.#committedLabel;
    this.#syncSelection(false);

    const control = input.closest<HTMLElement>('[data-slot~="combobox-control"]');

    // A select-look control is one big hit target
    input.addEventListener("click", () => this.#openPanel(), { signal });

    control?.addEventListener(
      "mousedown",
      (event) => {
        if (!(event.target instanceof Element) || event.target === input) return;
        // Nothing in the shell may steal focus from the input — the chevron and
        // the tag remove buttons would otherwise blur it and close the panel
        event.preventDefault();
        input.focus();
        if (!event.target.closest('[data-slot~="combobox-trigger"], [data-slot~="combobox-tag"]')) {
          this.#openPanel();
        }
      },
      { signal },
    );

    // Tag removal is delegated — the tags are re-stamped on every change
    control?.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const remove = event.target.closest('[data-slot~="combobox-tag-remove"]');
        if (!remove) return;
        // A template that forgets type="button" would otherwise submit the form
        event.preventDefault();
        const value = remove.closest('[data-slot~="combobox-tag"]')?.getAttribute("data-value");
        this.#deselect(this.items().find((item) => this.#itemFormValue(item) === value));
        input.focus();
      },
      { signal },
    );

    // Chevron toggles the full, unfiltered list
    const trigger = this.querySelector('[data-slot~="combobox-trigger"]');
    if (trigger instanceof HTMLElement) {
      trigger.addEventListener(
        "click",
        () => {
          if (this.open.get()) this.open.set(false);
          else this.#openPanel();
        },
        { signal },
      );
    }

    // Backspace on an empty filter drops the last tag
    if (multiselect) {
      input.addEventListener(
        "keydown",
        (event) => {
          if (event.key !== "Backspace" || input.value !== "") return;
          const last = this.#selectedItems().at(-1);
          if (!last) return;
          event.preventDefault();
          this.#deselect(last);
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
        const outcome = resolveBlur(input.value, this.#committedLabel, this.#multiselect());
        input.value = outcome.value;
        // Safe mid-close: the gated ranking effect ignores query writes while
        // the panel is fading out
        this.query.set("");
        if (outcome.clear) this.#clearSelection();
      },
      { signal },
    );

    // A form reset restores the selection the markup shipped with (reset
    // applies after the event)
    (hidden ?? input).form?.addEventListener(
      "reset",
      () => queueMicrotask(() => this.#restoreDefaults()),
      { signal },
    );
  }

  protected teardown(): void {
    for (const node of this.querySelectorAll(
      '[data-slot~="combobox-tag"], [data-combobox-stamped]',
    )) {
      node.remove();
    }
    if (this.searchInput) this.searchInput.placeholder = this.#placeholder;
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
   * @description Escape with the panel already closed restores the committed
   * label (single) or drops the filter text (multiselect) — never a half-typed
   * value, which a later blur would read as a cleared selection.
   */
  protected clearQuery(): void {
    const input = this.searchInput;
    if (!input) return;
    input.value = this.#multiselect() ? "" : this.#committedLabel;
    this.query.set("");
  }

  /**
   * @description Committing shows the item's label, stores its `data-value` in
   * the hidden input, and moves `aria-selected`. The multiselect variant
   * toggles the row instead and keeps the panel open so picking can continue.
   *
   * @param item - The committed option.
   */
  protected commit(item: HTMLElement, _source: "keyboard" | "pointer"): void {
    const input = this.searchInput;
    if (!input) return;

    if (this.#multiselect()) {
      item.setAttribute("aria-selected", String(item.getAttribute("aria-selected") !== "true"));
      input.value = "";
      this.query.set("");
      // Follow the row through the re-widened list so a second Enter toggles it
      // back: with an empty query every item is visible, and visual order is
      // DOM order (score ranking is stable at equal scores)
      this.activeIndex.set(this.items().indexOf(item));
      this.#syncSelection(true);
      input.focus();
      return;
    }

    this.#committedLabel = this.itemValue(item);
    input.value = this.#committedLabel;
    // The label is display text, not a filter — clearing the query is what
    // makes the reopened panel show the full list with this row ticked
    this.query.set("");
    for (const other of this.items()) other.removeAttribute("aria-selected");
    item.setAttribute("aria-selected", "true");
    this.#syncSelection(true);
    input.focus();
    // The inline variant has no popover to close, and closing it would gate its
    // filtering off for good. It also never reopens, so commit is where it
    // selects the label — the popover variants do that in #openPanel().
    if (this.panel?.hasAttribute("popover")) this.open.set(false);
    else input.select();
  }

  /**
   * @description Whether the multiselect variant is active.
   *
   * @returns True for `data-variant="multiselect"`.
   * @private
   */
  #multiselect(): boolean {
    return this.getAttribute("data-variant") === "multiselect";
  }

  /**
   * @description Opens the panel the way a select does: the full list, the
   * committed row highlighted, and its label selected so the first keystroke
   * replaces it. `activeIndex` is written here rather than from an effect —
   * effects are output adapters, and a write from inside one can be dropped
   * until the next notification.
   * @private
   */
  #openPanel(): void {
    const input = this.searchInput;
    if (!input || this.open.get()) return;
    if (this.#multiselect()) {
      input.value = "";
      this.activeIndex.set(-1);
    } else {
      input.value = this.#committedLabel;
      const selected = this.#selectedItems()[0];
      this.activeIndex.set(selected ? this.items().indexOf(selected) : -1);
      if (input.value !== "") input.select();
    }
    this.query.set("");
    this.open.set(true);
  }

  /**
   * @description The selection — items carrying `aria-selected="true"`, in DOM
   * order. The single source of truth for tags and form values alike.
   *
   * @returns The selected items.
   * @private
   */
  #selectedItems(): HTMLElement[] {
    return this.items().filter((item) => item.getAttribute("aria-selected") === "true");
  }

  /**
   * @description The single-select committed label.
   *
   * @returns The selected item's label, or undefined when nothing is selected.
   * @private
   */
  #selectedLabel(): string | undefined {
    const selected = this.#selectedItems()[0];
    return selected ? this.itemValue(selected) : undefined;
  }

  /**
   * @description An item's machine value.
   *
   * @param item - The item element.
   * @returns `data-value` when present, the visible label otherwise.
   * @private
   */
  #itemFormValue(item: HTMLElement): string {
    return item.getAttribute("data-value") ?? this.itemValue(item);
  }

  /**
   * @description Drops one item from the selection.
   *
   * @param item - The item to deselect; a no-op when undefined.
   * @private
   */
  #deselect(item: HTMLElement | undefined): void {
    if (!item) return;
    item.setAttribute("aria-selected", "false");
    this.#syncSelection(true);
  }

  /**
   * @description The authored hidden input carrying the form value — never one
   * of the stamped siblings.
   *
   * @returns The hidden input, or null when the author omitted it.
   * @private
   */
  #valueInput(): HTMLInputElement | null {
    const hidden = this.querySelector('[data-slot~="combobox-value"]:not([data-combobox-stamped])');
    return hidden instanceof HTMLInputElement ? hidden : null;
  }

  /**
   * @description Mirrors the selection into the two things derived from it: the
   * tags and the hidden inputs. The authored input carries the first value and
   * stamped siblings carry the rest under the same `name`, so a multiselection
   * submits as repeated pairs exactly like `<select multiple>`. DOM
   * construction stays imperative — the DOM is the source of truth here, not a
   * signal.
   *
   * @param notify - Whether to dispatch `change` (skipped while seeding).
   * @private
   */
  #syncSelection(notify: boolean): void {
    const input = this.searchInput;
    const values = this.#selectedItems().map((item) => this.#itemFormValue(item));
    const serialized = JSON.stringify(values);
    const changed = serialized !== this.#serialized;
    this.#serialized = serialized;

    if (input && this.#multiselect()) this.#renderTags(input);

    const hidden = this.#valueInput();
    if (!hidden) return;
    hidden.value = values[0] ?? "";
    for (const stale of this.querySelectorAll("[data-combobox-stamped]")) stale.remove();
    let anchor: Element = hidden;
    for (const value of values.slice(1)) {
      const extra = document.createElement("input");
      extra.type = "hidden";
      extra.setAttribute("data-slot", "combobox-value");
      extra.setAttribute("data-combobox-stamped", "");
      if (hidden.name) extra.name = hidden.name;
      extra.value = value;
      anchor.after(extra);
      anchor = extra;
    }
    if (notify && changed) hidden.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * @description The element cloned per selected value: the first child of an
   * authored `<template data-slot="combobox-tag-template">` when present, the
   * default ui-badge otherwise. A template's content lives in a separate
   * fragment, so a blueprint carrying `data-slot="combobox-tag"` is invisible to
   * the stale-tag sweep and can never be mistaken for a rendered tag.
   *
   * @returns The blueprint element, or null when an authored template is empty.
   * @private
   */
  #tagBlueprint(): HTMLElement | null {
    const authored = this.querySelector('[data-slot~="combobox-tag-template"]');
    const template = authored instanceof HTMLTemplateElement ? authored : defaultTagBlueprint();
    const root = template.content.firstElementChild;
    return root instanceof HTMLElement ? root : null;
  }

  /**
   * @description Re-stamps the selection tags inside the control, in DOM order.
   * Rebuilt wholesale rather than diffed: the tags are pure output, nothing
   * focusable ever lands inside one, and removal is delegated from the control.
   *
   * @param input - The search input the tags render before.
   * @private
   */
  #renderTags(input: HTMLInputElement): void {
    const control = input.closest('[data-slot~="combobox-control"]');
    if (!control) return;
    for (const stale of control.querySelectorAll('[data-slot~="combobox-tag"]')) stale.remove();

    const blueprint = this.#tagBlueprint();
    if (!blueprint) return;

    const removeLabel = this.getAttribute("data-label-remove") ?? "Remove {label}";
    const tags = this.#selectedItems().map((item) => {
      const label = this.itemValue(item);
      const tag = blueprint.cloneNode(true) as HTMLElement;
      tag.setAttribute("data-value", this.#itemFormValue(item));

      // The slot is the contract every other moving part keys off — the CSS, the
      // stale sweep above, and tag removal — so add the token if the template
      // left it out rather than stamping an orphan
      if (!tag.matches('[data-slot~="combobox-tag"]')) {
        const slots = tag.getAttribute("data-slot");
        tag.setAttribute("data-slot", slots ? `${slots} combobox-tag` : "combobox-tag");
      }

      // The label wants its own box — text-overflow ignores a flex container's
      // own text — but a template without one still gets its text
      const text = tag.querySelector('[data-slot~="combobox-tag-label"]');
      if (text) text.textContent = label;
      else tag.prepend(document.createTextNode(label));

      tag
        .querySelector('[data-slot~="combobox-tag-remove"]')
        ?.setAttribute("aria-label", resolveRemoveLabel(removeLabel, label));

      return tag;
    });

    input.before(...tags);
    input.placeholder = tags.length > 0 ? "" : this.#placeholder;
  }

  /**
   * @description Empties the committed state: label, hidden value, tags, and
   * `aria-selected` all clear together.
   * @private
   */
  #clearSelection(): void {
    this.#committedLabel = "";
    const multiselect = this.#multiselect();
    for (const item of this.items()) {
      if (multiselect) item.setAttribute("aria-selected", "false");
      else item.removeAttribute("aria-selected");
    }
    this.#syncSelection(true);
  }

  /**
   * @description Restores the selection the markup shipped with (form reset).
   * @private
   */
  #restoreDefaults(): void {
    const input = this.searchInput;
    if (!input) return;
    const multiselect = this.#multiselect();
    for (const item of this.items()) {
      const selected = this.#defaultValues.includes(this.#itemFormValue(item));
      if (multiselect) item.setAttribute("aria-selected", String(selected));
      else if (selected) item.setAttribute("aria-selected", "true");
      else item.removeAttribute("aria-selected");
    }
    this.#committedLabel = multiselect ? "" : (this.#selectedLabel() ?? "");
    input.value = this.#committedLabel;
    this.query.set("");
    this.#syncSelection(true);
  }
}

defineZazzElement("ui-combobox", UiCombobox);

export { UiCombobox, resolveBlur, resolveRemoveLabel };
export type { BlurOutcome };
