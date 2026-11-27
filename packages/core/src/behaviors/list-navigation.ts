"use strict";

/**
 * @fileoverview List navigation: the keys that move through a list of items.
 * @description The decision half of arrow-key navigation, shared by the
 * tabs, the menu, and the typeahead engine (autocomplete, combobox, command).
 *
 * A key press is two questions, and each has one function:
 *
 * - `listStep()`: which step is this key? The arrows along the list's
 *   orientation are `next` and `previous`, mirrored in RTL for a horizontal
 *   list; Home and End are `first` and `last`. Any other key is `null`, so the
 *   caller returns before it calls `preventDefault()`.
 * - `stepIndex()`: where does that step land? Lists wrap at both ends.
 *
 * The primitive owns everything else: which elements are items, and what
 * moving means there (focus a link, check a radio, set
 * `aria-activedescendant`). `isDisabledItem()` is the one test for an item the
 * keys skip.
 *
 * @example
 * const step = listStep(event.key, { orientation: "horizontal", rtl });
 * if (!step) return;
 * event.preventDefault();
 * items[stepIndex(items.indexOf(target), step, items.length)]?.focus();
 */

// --- Types ---

/** A move through a list. */
type ListStep = "next" | "previous" | "first" | "last";

/** How a list is laid out, which decides the arrow keys that move through it. */
interface ListLayout {
  /** The axis the items run along. Defaults to `vertical`. */
  orientation?: "vertical" | "horizontal";
  /** Whether the list's writing direction is right to left. Only a horizontal list reads it. */
  rtl?: boolean;
}

// --- Keys ---

/**
 * @description Maps a key to a step through a list. The arrows across the
 * list's orientation are not steps, so a vertical list leaves ArrowLeft and
 * ArrowRight to the page.
 *
 * @param key - The `KeyboardEvent.key` pressed.
 * @param layout - The list's orientation and writing direction.
 * @returns The step, or null when the key does not move through the list.
 */
function listStep(key: string, layout: ListLayout = {}): ListStep | null {
  if (key === "Home") return "first";
  if (key === "End") return "last";

  if (layout.orientation === "horizontal") {
    const [previous, next] = layout.rtl ? ["ArrowRight", "ArrowLeft"] : ["ArrowLeft", "ArrowRight"];
    if (key === next) return "next";
    if (key === previous) return "previous";
    return null;
  }

  if (key === "ArrowDown") return "next";
  if (key === "ArrowUp") return "previous";
  return null;
}

// --- Index ---

/**
 * @description Reducer for a step through a wrapping list. From no current
 * item, `next` enters at the first item and `previous` at the last.
 *
 * @param current - The current index, -1 for none.
 * @param step - The step to take.
 * @param count - How many items the list has.
 * @returns The index the step lands on, -1 when the list is empty.
 */
function stepIndex(current: number, step: ListStep, count: number): number {
  if (count === 0) return -1;
  switch (step) {
    case "next":
      return current < 0 ? 0 : (current + 1) % count;
    case "previous":
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case "first":
      return 0;
    case "last":
      return count - 1;
  }
}

// --- Items ---

/**
 * @description Whether the keys skip an item: a disabled form control, or any
 * element marked `aria-disabled="true"` (a link has no `disabled`).
 *
 * @param item - The list item.
 * @returns True when the item is disabled.
 */
function isDisabledItem(item: Element): boolean {
  return item.matches(":disabled") || item.getAttribute("aria-disabled") === "true";
}

export { listStep, stepIndex, isDisabledItem };
export type { ListLayout, ListStep };
