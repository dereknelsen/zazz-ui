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
import { ZazzElement } from "../../base/zazz-element.ts";
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
/**
 * @description Parses `data-otp-groups` ("3-3") into group sizes. Groups that
 * don't sum to the code length fall back to one ungrouped run.
 *
 * @param raw - The attribute value, or null.
 * @param length - The code length.
 * @returns Group sizes summing to `length`.
 */
declare function parseGroups(raw: string | null, length: number): number[];
/**
 * @description Filters raw input text to the allowed charset and clamps it to
 * the code length. Whitespace never survives (pasted codes often carry it).
 *
 * @param raw - The input's current value.
 * @param type - The allowed charset.
 * @param length - The code length.
 * @returns The sanitized value.
 */
declare function sanitizeOtp(raw: string, type: OtpType, length: number): string;
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
declare function resolveSlots(
  value: string,
  length: number,
  caret: number,
  focused: boolean,
  mask: boolean,
): SlotState[];
/**
 * @description Whether the code is complete.
 *
 * @param value - The sanitized value.
 * @param length - The code length.
 * @returns True when every cell is filled.
 */
declare function isComplete(value: string, length: number): boolean;
declare class UiOtp extends ZazzElement {
  #private;
  protected setup(signal: AbortSignal): void;
  protected teardown(): void;
}
export { UiOtp, parseGroups, sanitizeOtp, resolveSlots, isComplete };
export type { OtpType, SlotState };
//# sourceMappingURL=otp.d.ts.map
