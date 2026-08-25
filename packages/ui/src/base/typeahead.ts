"use strict";

/**
 * @fileoverview Shared typeahead engine for autocomplete, combobox, and command.
 * @description The common runtime behind the filter-as-you-type family: a
 * query signal fed by the input, score-based ranking of real DOM items
 * (`commandScore`), active-item keyboard navigation with
 * `aria-activedescendant` (focus never leaves the input), and — for the form
 * controls whose panel sits outside the input — ownership of a
 * `popover="manual"` panel with outside-pointerdown and Escape close paths.
 *
 * Subclasses (`UiAutocomplete`, `UiCombobox`, `UiCommand`) declare their slot
 * prefix and commit semantics; everything else lives here. Filtering only
 * writes `hidden` and (when ranking) inline `order` — the DOM is never
 * restructured, so forms, focus, and progressive enhancement are untouched.
 * Groups and empty states hide with CSS `:has()`, not code.
 *
 * Item facts come from the markup: the match/commit text is `data-value`
 * (falling back to text content) and `data-keywords` adds extra match
 * targets. `data-sort="score"` on the root re-ranks visually via `order`.
 */

import { commandScore } from "./command-score.ts";
import { ZazzElement } from "./zazz-element.ts";
import { effect, state } from "./signals.ts";

// --- Pure ranking + navigation ---

/** What the ranker needs to know about one item. */
interface ItemFacts {
  /** The text scored and committed — `data-value` ?? trimmed text content. */
  value: string;
  /** Extra match targets from `data-keywords`. */
  keywords: string[];
}

/** The ranker's verdict for one item, in input order. */
interface RankedItem {
  /** The item's index in the input array. */
  index: number;
  /** `commandScore` result, 0–1; 1 for every item when the query is empty. */
  score: number;
  /** Whether the item should be hidden. */
  hidden: boolean;
}

/**
 * @description Scores every item against the query. An empty query leaves all
 * items visible with a neutral score.
 *
 * @param query - What the user typed.
 * @param items - Facts for each item, in DOM order.
 * @returns One verdict per item, same order as the input.
 */
function rankItems(query: string, items: readonly ItemFacts[]): RankedItem[] {
  const trimmed = query.trim();
  return items.map((item, index) => {
    const score = trimmed === "" ? 1 : commandScore(item.value, trimmed, item.keywords);
    return { index, score, hidden: score <= 0 };
  });
}

/**
 * @description Reducer for active-item keyboard navigation. ArrowDown from
 * nothing highlights the first item, ArrowUp from nothing the last; both wrap.
 *
 * @param current - The currently active index, -1 for none.
 * @param key - The `KeyboardEvent.key` pressed.
 * @param count - How many items are visible.
 * @returns The next active index, -1 when there is nothing to highlight.
 */
function nextActiveIndex(current: number, key: string, count: number): number {
  if (count === 0) return -1;
  switch (key) {
    case "ArrowDown":
      return current < 0 ? 0 : (current + 1) % count;
    case "ArrowUp":
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}

// --- Element base ---

let typeaheadIdCounter = 0;

/**
 * @description Base class for the typeahead family. Subclasses set the slot
 * prefix and commit behavior; the base owns query state, ranking, keyboard
 * navigation, ARIA wiring, and (when `managesPanel`) the manual popover.
 */
abstract class TypeaheadElement extends ZazzElement {
  /** Slot prefix — `"autocomplete"` finds `autocomplete-panel`, `-list`, `-item`. */
  protected abstract readonly slotPrefix: string;
  /** Whether this element opens/closes its own `popover="manual"` panel. */
  protected readonly managesPanel: boolean = true;
  /** Whether ranking also re-orders visually via inline `order`. */
  protected get sortByScore(): boolean {
    return this.getAttribute("data-sort") === "score";
  }
  /** Whether filtering auto-highlights the best item (command palettes do). */
  protected readonly autoHighlight: boolean = false;

  /**
   * Applies a committed item — fill the input, sync a value, activate.
   * `source` says how the commit happened: a pointer commit has already run
   * the item's native activation (link, invoker command); a keyboard commit
   * has not.
   */
  protected abstract commit(item: HTMLElement, source: "keyboard" | "pointer"): void;

  protected searchInput: HTMLInputElement | null = null;
  protected panel: HTMLElement | null = null;

  protected readonly query = state("");
  protected readonly open = state(false);
  protected readonly activeIndex = state(-1);

  protected setup(signal: AbortSignal): void {
    const prefix = this.slotPrefix;
    const panel = this.querySelector(`[data-slot~="${prefix}-panel"]`);
    const input =
      this.querySelector<HTMLInputElement>('input[role="combobox"]') ??
      this.querySelector<HTMLInputElement>(`[data-slot~="${prefix}-input"]`);
    if (!(panel instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return;
    this.panel = panel;
    this.searchInput = input;

    const list = panel.querySelector(`[data-slot~="${prefix}-list"]`);
    if (list instanceof HTMLElement) {
      list.id ||= `ui-${prefix}-list-${++typeaheadIdCounter}`;
      input.setAttribute("aria-controls", list.id);
    }

    // Input adapters — DOM events only write signals
    input.addEventListener(
      "input",
      () => {
        this.query.set(input.value);
        this.activeIndex.set(this.autoHighlight ? 0 : -1);
        if (this.managesPanel && !this.#inlinePanel()) {
          this.open.set(input.value.length >= this.#minLength());
        }
      },
      { signal },
    );

    input.addEventListener("keydown", (event) => this.#onKeydown(event), { signal });

    if (this.#inlinePanel()) {
      // Inline variant — a panel without [popover] renders in flow and is
      // always open; there is nothing to show, hide, or light-dismiss
      this.open.set(true);
      input.setAttribute("aria-expanded", "true");
    } else if (this.managesPanel) {
      input.addEventListener(
        "focus",
        () => {
          if (input.value.length >= this.#minLength()) this.open.set(true);
        },
        { signal },
      );

      // Outside pointerdown closes; inside the panel it must not steal focus
      document.addEventListener(
        "pointerdown",
        (event) => {
          if (!(event.target instanceof Node)) return;
          if (this.contains(event.target)) return;
          this.open.set(false);
        },
        { signal },
      );

      this.addEventListener(
        "focusout",
        (event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && this.contains(next)) return;
          this.open.set(false);
        },
        { signal },
      );
    } else if (panel instanceof HTMLDialogElement) {
      // Native <dialog> surface — mirror the dialog-lifecycle events
      this.addEventListener(
        "zazz:dialog-open",
        (event) => {
          if (event.target !== panel) return;
          this.open.set(true);
          input.focus();
        },
        { signal },
      );
      this.addEventListener(
        "zazz:dialog-close",
        (event) => {
          if (event.target !== panel) return;
          this.open.set(false);
        },
        { signal },
      );
    } else {
      // Native popover="auto" surface owns open/close; mirror it
      panel.addEventListener(
        "toggle",
        (event) => {
          const opened = (event as ToggleEvent).newState === "open";
          this.open.set(opened);
          if (opened) input.focus();
        },
        { signal },
      );
    }

    // Item click = commit (pointerdown ordering keeps focus in the input)
    panel.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const item = event.target.closest<HTMLElement>(`[data-slot~="${prefix}-item"]`);
        if (item && !item.hidden) this.commit(item, "pointer");
      },
      { signal },
    );

    // Output adapter 1 — panel visibility + expanded state (the inline
    // variant is unconditionally open, so it binds no visibility effect)
    if (this.#inlinePanel()) {
      // Nothing to drive
    } else if (this.managesPanel) {
      effect(
        () => {
          const opened = this.open.get();
          input.setAttribute("aria-expanded", String(opened));
          if (opened && !this.#panelOpen()) panel.showPopover();
          else if (!opened && this.#panelOpen()) panel.hidePopover();
          if (!opened) this.activeIndex.set(-1);
        },
        { signal },
      );
    } else {
      effect(
        () => {
          input.setAttribute("aria-expanded", String(this.open.get()));
        },
        { signal },
      );
    }

    // Output adapter 2 — ranking, visibility, highlight, activedescendant
    effect(
      () => {
        const query = this.query.get();
        const active = this.activeIndex.get();
        const items = this.items();
        const ranked = rankItems(
          query,
          items.map((item) => ({
            value: this.itemValue(item),
            keywords: (item.getAttribute("data-keywords") ?? "").split(/\s+/).filter(Boolean),
          })),
        );

        const sort = this.sortByScore;
        for (const verdict of ranked) {
          const item = items[verdict.index];
          item.hidden = verdict.hidden;
          if (sort) item.style.order = String(-Math.round(verdict.score * 1000));
          else if (item.style.order) item.style.removeProperty("order");
        }

        const visible = this.visibleItems(items, ranked);
        visible.forEach((item, index) => {
          item.id ||= `ui-${prefix}-item-${++typeaheadIdCounter}`;
          if (index === active) item.setAttribute("data-highlighted", "");
          else item.removeAttribute("data-highlighted");
        });

        const highlighted = active >= 0 ? visible[active] : undefined;
        if (highlighted) {
          input.setAttribute("aria-activedescendant", highlighted.id);
          highlighted.scrollIntoView({ block: "nearest" });
        } else {
          input.removeAttribute("aria-activedescendant");
        }
      },
      { signal },
    );
  }

  /**
   * @description The panel's items, in DOM order.
   *
   * @returns Every `<prefix>-item` element in the panel.
   */
  protected items(): HTMLElement[] {
    const panel = this.panel;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll(`[data-slot~="${this.slotPrefix}-item"]`)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
  }

  /**
   * @description The visible items in visual order — score order when
   * `data-sort="score"`, DOM order otherwise — so arrow keys always follow
   * what the user sees.
   *
   * @param items - All items, DOM order.
   * @param ranked - The ranker's verdicts for those items.
   * @returns Visible items in visual order.
   */
  protected visibleItems(
    items: readonly HTMLElement[],
    ranked: readonly RankedItem[],
  ): HTMLElement[] {
    const visible = ranked.filter((verdict) => !verdict.hidden);
    if (this.sortByScore) visible.sort((a, b) => b.score - a.score || a.index - b.index);
    return visible.map((verdict) => items[verdict.index]);
  }

  /**
   * @description The text an item matches and commits with. The text-content
   * fallback excludes `<kbd>` shortcut hints, which are presentation, not
   * value — "Go to docs ⇧⌘D" should match and announce as "Go to docs".
   *
   * @param item - The item element.
   * @returns `data-value` when present, trimmed hint-free text otherwise.
   */
  protected itemValue(item: HTMLElement): string {
    const explicit = item.getAttribute("data-value");
    if (explicit !== null) return explicit;
    if (!item.querySelector("kbd, ui-kbd-group")) return item.textContent?.trim() ?? "";
    const clone = item.cloneNode(true) as HTMLElement;
    for (const hint of clone.querySelectorAll("kbd, ui-kbd-group")) hint.remove();
    return clone.textContent?.trim() ?? "";
  }

  /**
   * @description Minimum query length before the panel opens (`data-min-length`).
   *
   * @returns The threshold, 0 by default.
   * @private
   */
  #minLength(): number {
    const raw = Number(this.getAttribute("data-min-length"));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }

  /**
   * @description Whether the panel is the inline variant — rendered in flow
   * without `[popover]`, and therefore always open.
   *
   * @returns True for an inline panel.
   * @private
   */
  #inlinePanel(): boolean {
    return this.managesPanel && this.panel !== null && !this.panel.hasAttribute("popover");
  }

  /**
   * @description Whether the panel popover is currently shown (polyfill-aware).
   *
   * @returns True when open.
   * @private
   */
  #panelOpen(): boolean {
    return this.panel?.matches(":popover-open, .\\:popover-open") ?? false;
  }

  /**
   * @description Keyboard contract on the search input: arrows/Home/End move
   * the highlight, Enter commits it, Escape closes then clears (only when the
   * element manages its own panel — native surfaces own Escape themselves).
   *
   * @param event - The keydown event.
   * @private
   */
  #onKeydown(event: KeyboardEvent): void {
    const input = this.searchInput;
    if (!input) return;

    if (event.key === "Escape" && this.managesPanel) {
      // The inline variant has no panel to close — Escape only clears
      if (this.open.get() && !this.#inlinePanel()) {
        event.preventDefault();
        this.open.set(false);
      } else if (input.value) {
        event.preventDefault();
        input.value = "";
        this.query.set("");
      }
      return;
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      // Home/End belong to the text caret unless an item is already active
      if ((event.key === "Home" || event.key === "End") && this.activeIndex.get() < 0) return;
      event.preventDefault();
      if (this.managesPanel && !this.open.get()) this.open.set(true);
      const count = this.items().filter((item) => !item.hidden).length;
      this.activeIndex.set(nextActiveIndex(this.activeIndex.get(), event.key, count));
      return;
    }

    if (event.key === "Enter") {
      const items = this.items();
      const visible = items.filter((item) => !item.hidden);
      const sorted = this.sortByScore
        ? this.visibleItems(
            items,
            rankItems(
              this.query.get(),
              items.map((item) => ({
                value: this.itemValue(item),
                keywords: (item.getAttribute("data-keywords") ?? "").split(/\s+/).filter(Boolean),
              })),
            ),
          )
        : visible;
      const active = this.activeIndex.get();
      const item = active >= 0 ? sorted[active] : undefined;
      if (item) {
        event.preventDefault();
        this.commit(item, "keyboard");
      }
    }
  }
}

export { TypeaheadElement, rankItems, nextActiveIndex };
export type { ItemFacts, RankedItem };
