"use strict";

/**
 * @fileoverview `<ui-otp>` — a one-time password field with character slots.
 * @description Light-DOM custom element that augments ONE real
 * `<input class="ui-input ui-otp-input">` — the MDN-blessed OTP shape with
 * `autocomplete="one-time-code"`, `inputmode`, `pattern`, and `maxlength` —
 * with a presentational slot rail. The input stays the source of truth:
 * autofill, paste, IME, undo, form submission, and `:user-invalid` are all
 * native. The script stamps an `aria-hidden` rail of character cells behind
 * the input and stretches the input invisibly over it; each cell mirrors one
 * character and the caret position. Without JavaScript the markup is a plain,
 * fully functional OTP input.
 *
 * The code length comes from the input's `maxlength` — there is no
 * `data-otp-length`.
 *
 * Attributes on `<ui-otp>`:
 * - `data-otp-groups` — separator layout, e.g. `"3-3"` or `"2-2-2"`. The
 *   groups must sum to `maxlength`; otherwise one ungrouped run renders.
 * - `data-otp-type` — sanitization charset: `numeric` (default), `alpha`,
 *   `alphanumeric`, `none`. Keep it in agreement with the input's `pattern`
 *   and `inputmode`, which carry the no-JS validation.
 * - `data-otp-mask` — render `•` in the cells instead of characters.
 * - `data-otp-auto-submit` — request the owning form's submission once when
 *   the code is complete.
 *
 * Stamped state: cells are `[data-slot~="otp-slot"]` with `data-filled` /
 * `data-active`; separators are `[data-slot~="otp-separator"]`; the root
 * gains `data-otp-ready` when enhanced and `data-otp-complete` when full.
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";
import { effect, state } from "../../base/signals.ts";

// --- Types ---

/** Sanitization charset for typed and pasted text. */
type OtpType = "numeric" | "alpha" | "alphanumeric" | "none";

/** One rendered cell: its character and its state flags. */
interface SlotState {
  /** The character to render ("" when empty; "•" when masked and filled). */
  char: string;
  /** Whether the cell holds a character. */
  filled: boolean;
  /** Whether the caret sits on this cell. */
  active: boolean;
}

// --- Pure derivations (exported for unit tests only) ---

/**
 * @description Parses `data-otp-groups` ("3-3") into group sizes. Groups that
 * don't sum to the code length fall back to one ungrouped run.
 *
 * @param raw - The attribute value, or null.
 * @param length - The code length.
 * @returns Group sizes summing to `length`.
 */
function parseGroups(raw: string | null, length: number): number[] {
  if (!raw) return [length];
  const groups = raw
    .split("-")
    .map((part) => Number.parseInt(part, 10))
    .filter((size) => Number.isFinite(size) && size > 0);
  const total = groups.reduce((sum, size) => sum + size, 0);
  return total === length && groups.length > 0 ? groups : [length];
}

/**
 * @description Filters raw input text to the allowed charset and clamps it to
 * the code length. Whitespace never survives (pasted codes often carry it).
 *
 * @param raw - The input's current value.
 * @param type - The allowed charset.
 * @param length - The code length.
 * @returns The sanitized value.
 */
function sanitizeOtp(raw: string, type: OtpType, length: number): string {
  let allowed: RegExp;
  switch (type) {
    case "numeric":
      allowed = /[^0-9]/g;
      break;
    case "alpha":
      allowed = /[^a-zA-Z]/g;
      break;
    case "alphanumeric":
      allowed = /[^a-zA-Z0-9]/g;
      break;
    case "none":
      allowed = /\s/g;
      break;
  }
  return raw.replace(allowed, "").slice(0, length);
}

/**
 * @description Derives every cell's character and state from the input's
 * value and caret. The active cell tracks the caret; with the code full, the
 * last cell stays active.
 *
 * @param value - The sanitized value.
 * @param length - The code length.
 * @param caret - The input's caret position.
 * @param focused - Whether the input has focus.
 * @param mask - Whether to obscure characters.
 * @returns One state per cell.
 */
function resolveSlots(
  value: string,
  length: number,
  caret: number,
  focused: boolean,
  mask: boolean,
): SlotState[] {
  const activeIndex = focused ? Math.min(caret, length - 1) : -1;
  return Array.from({ length }, (_, index) => {
    const char = value.charAt(index);
    return {
      char: char === "" ? "" : mask ? "•" : char,
      filled: char !== "",
      active: index === activeIndex,
    };
  });
}

/**
 * @description Whether the code is complete.
 *
 * @param value - The sanitized value.
 * @param length - The code length.
 * @returns True when every cell is filled.
 */
function isComplete(value: string, length: number): boolean {
  return length > 0 && value.length === length;
}

// --- Element ---

class UiOtp extends ZazzElement {
  #rail: HTMLElement | null = null;
  #lastSubmitted = "";

  protected setup(signal: AbortSignal): void {
    const input = this.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return;

    const length = input.maxLength > 0 ? input.maxLength : 6;
    const type = (this.getAttribute("data-otp-type") ?? "numeric") as OtpType;
    const mask = this.hasAttribute("data-otp-mask");
    const groups = parseGroups(this.getAttribute("data-otp-groups"), length);

    const rail = this.#stampRail(groups);
    this.setAttribute("data-otp-ready", "");

    const value = state(sanitizeOtp(input.value, type, length));
    const caret = state(input.selectionStart ?? 0);
    const focused = state(document.activeElement === input);

    // Input adapters — sanitize in place, then mirror value + caret
    input.addEventListener(
      "input",
      () => {
        const clean = sanitizeOtp(input.value, type, length);
        if (input.value !== clean) input.value = clean;
        value.set(clean);
        caret.set(input.selectionStart ?? clean.length);
      },
      { signal },
    );

    document.addEventListener(
      "selectionchange",
      () => {
        if (document.activeElement !== input) return;
        caret.set(input.selectionStart ?? 0);
      },
      { signal },
    );

    input.addEventListener("focus", () => focused.set(true), { signal });
    input.addEventListener("blur", () => focused.set(false), { signal });

    // Clicking a cell moves the caret to it
    rail.addEventListener(
      "pointerdown",
      (event) => {
        const cell =
          event.target instanceof Element ? event.target.closest("[data-otp-index]") : null;
        event.preventDefault();
        input.focus();
        const index = cell ? Number(cell.getAttribute("data-otp-index")) : length;
        const position = Math.min(index, input.value.length);
        input.setSelectionRange(position, position);
        caret.set(position);
      },
      { signal },
    );

    // Output adapter — one effect writes every derived attribute together
    effect(
      () => {
        const slots = resolveSlots(value.get(), length, caret.get(), focused.get(), mask);
        const cells = rail.querySelectorAll("[data-otp-index]");
        slots.forEach((slot, index) => {
          const cell = cells[index];
          if (!(cell instanceof HTMLElement)) return;
          cell.textContent = slot.char;
          if (slot.filled) cell.setAttribute("data-filled", "");
          else cell.removeAttribute("data-filled");
          if (slot.active) cell.setAttribute("data-active", "");
          else cell.removeAttribute("data-active");
        });

        const complete = isComplete(value.get(), length);
        if (complete) this.setAttribute("data-otp-complete", "");
        else this.removeAttribute("data-otp-complete");

        if (complete && this.hasAttribute("data-otp-auto-submit")) {
          // Once per distinct complete value, so corrections can resubmit
          if (this.#lastSubmitted !== value.get()) {
            this.#lastSubmitted = value.get();
            input.form?.requestSubmit();
          }
        }
      },
      { signal },
    );
  }

  protected teardown(): void {
    this.#rail?.remove();
    this.#rail = null;
    this.removeAttribute("data-otp-ready");
    this.removeAttribute("data-otp-complete");
  }

  /**
   * @description Builds the aria-hidden cell rail (with separators between
   * groups) and inserts it after the input.
   *
   * @param groups - Group sizes, summing to the code length.
   * @returns The rail element.
   * @private
   */
  #stampRail(groups: number[]): HTMLElement {
    const rail = document.createElement("div");
    rail.setAttribute("data-slot", "otp-rail");
    rail.setAttribute("aria-hidden", "true");

    let index = 0;
    groups.forEach((size, groupIndex) => {
      if (groupIndex > 0) {
        const separator = document.createElement("span");
        separator.setAttribute("data-slot", "otp-separator");
        separator.setAttribute("aria-role", "presentation");
        separator.textContent = "–";
        rail.append(separator);
      }
      for (let i = 0; i < size; i++) {
        const cell = document.createElement("span");
        cell.setAttribute("data-slot", "otp-slot");
        cell.setAttribute("data-otp-index", String(index++));
        rail.append(cell);
      }
    });

    this.append(rail);
    this.#rail = rail;
    return rail;
  }
}

defineZazzElement("ui-otp", UiOtp);

export { UiOtp, parseGroups, sanitizeOtp, resolveSlots, isComplete };
export type { OtpType, SlotState };
