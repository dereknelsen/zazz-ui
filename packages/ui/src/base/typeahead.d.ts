import { ZazzElement } from "./zazz-element.ts";
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
declare function rankItems(query: string, items: readonly ItemFacts[]): RankedItem[];
/**
 * @description Reducer for active-item keyboard navigation. ArrowDown from
 * nothing highlights the first item, ArrowUp from nothing the last; both wrap.
 *
 * @param current - The currently active index, -1 for none.
 * @param key - The `KeyboardEvent.key` pressed.
 * @param count - How many items are visible.
 * @returns The next active index, -1 when there is nothing to highlight.
 */
declare function nextActiveIndex(current: number, key: string, count: number): number;
/**
 * @description Base class for the typeahead family. Subclasses set the slot
 * prefix and commit behavior; the base owns query state, ranking, keyboard
 * navigation, ARIA wiring, and (when `managesPanel`) the manual popover.
 */
declare abstract class TypeaheadElement extends ZazzElement {
  #private;
  /** Slot prefix — `"autocomplete"` finds `autocomplete-panel`, `-list`, `-item`. */
  protected abstract readonly slotPrefix: string;
  /** Whether this element opens/closes its own `popover="manual"` panel. */
  protected readonly managesPanel: boolean;
  /** Whether ranking also re-orders visually via inline `order`. */
  protected get sortByScore(): boolean;
  /** Whether filtering auto-highlights the best item (command palettes do). */
  protected readonly autoHighlight: boolean;
  /**
   * Applies a committed item — fill the input, sync a value, activate.
   * `source` says how the commit happened: a pointer commit has already run
   * the item's native activation (link, invoker command); a keyboard commit
   * has not.
   */
  protected abstract commit(item: HTMLElement, source: "keyboard" | "pointer"): void;
  protected searchInput: HTMLInputElement | null;
  protected panel: HTMLElement | null;
  protected readonly query: import("signal-polyfill").Signal.State<string>;
  protected readonly open: import("signal-polyfill").Signal.State<boolean>;
  protected readonly activeIndex: import("signal-polyfill").Signal.State<number>;
  protected setup(signal: AbortSignal): void;
  /**
   * @description The panel's items, in DOM order.
   *
   * @returns Every `<prefix>-item` element in the panel.
   */
  protected items(): HTMLElement[];
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
  ): HTMLElement[];
  /**
   * @description The text an item matches and commits with. The text-content
   * fallback excludes `<kbd>` shortcut hints, which are presentation, not
   * value — "Go to docs ⇧⌘D" should match and announce as "Go to docs".
   *
   * @param item - The item element.
   * @returns `data-value` when present, trimmed hint-free text otherwise.
   */
  protected itemValue(item: HTMLElement): string;
}
export { TypeaheadElement, rankItems, nextActiveIndex };
export type { ItemFacts, RankedItem };
//# sourceMappingURL=typeahead.d.ts.map
