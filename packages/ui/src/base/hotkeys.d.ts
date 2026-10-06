/**
 * @fileoverview Minimal hotkey parsing and matching for the command family.
 * @description Turns `"mod+k"`-style specs into structured hotkeys and matches
 * them against keyboard events. `mod` resolves to Meta on Apple platforms and
 * Control elsewhere. Bare-key hotkeys (no modifier) are suppressed while the
 * user types in an editable context so accelerators never eat input.
 *
 * This file is a deliberate seam (like `signals.ts`): the kit's needs are a
 * parser, a matcher, and an editable-target guard, so a dependency was not
 * worth the pinning contract — swap the internals here if a library ever
 * earns its keep.
 *
 * Spec grammar: `+`-separated tokens, case-insensitive. Modifiers: `mod`,
 * `ctrl`/`control`, `alt`/`option`, `shift`, `meta`/`cmd`/`super`. The final
 * token is the key, compared against `KeyboardEvent.key` (single letters
 * case-insensitively, so `mod+K` and `mod+k` are the same hotkey).
 */
/** A parsed hotkey: required modifiers plus the terminal key. */
interface Hotkey {
  /** Required `KeyboardEvent.key`, lowercased for single characters. */
  key: string;
  /** Requires Control. */
  ctrl: boolean;
  /** Requires Alt/Option. */
  alt: boolean;
  /** Requires Shift. */
  shift: boolean;
  /** Requires Meta/Command. */
  meta: boolean;
  /** Requires the platform primary modifier (Meta on Apple, Control elsewhere). */
  mod: boolean;
}
/**
 * @description Parses a `"mod+shift+p"`-style spec into a structured hotkey.
 *
 * @param spec - The hotkey spec, `+`-separated, case-insensitive.
 * @returns The parsed hotkey, or null for an empty/invalid spec.
 */
declare function parseHotkey(spec: string): Hotkey | null;
/**
 * @description Matches a keyboard event against a parsed hotkey. Modifier
 * states must match exactly — `mod+k` does not fire on `mod+shift+k` — except
 * that `mod` claims whichever of Meta/Control the platform assigns it.
 *
 * @param event - The keyboard event to test.
 * @param hotkey - The parsed hotkey to match.
 * @param apple - Platform override for tests; defaults to detection.
 * @returns True when the event is exactly this hotkey.
 */
declare function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey, apple?: boolean): boolean;
/**
 * @description Whether a node is an editable context (form field or
 * contenteditable), where bare-key hotkeys must not fire.
 *
 * @param node - The event target to inspect.
 * @returns True when typing belongs to the node, not to hotkeys.
 */
declare function isEditableTarget(node: EventTarget | null): boolean;
/**
 * @description Whether a hotkey uses no modifier at all (a bare key), which
 * should be suppressed in editable contexts.
 *
 * @param hotkey - The parsed hotkey.
 * @returns True when no modifier is required.
 */
declare function isBareKey(hotkey: Hotkey): boolean;
/**
 * @description Binds a document-level listener for one hotkey spec. Bare-key
 * specs are suppressed while focus is in an editable context; matches call
 * `preventDefault()` before the callback.
 *
 * @param spec - The hotkey spec, e.g. `"mod+k"`.
 * @param callback - Runs on each match, receiving the keyboard event.
 * @param options - `signal` unbinds the listener when aborted.
 * @returns True when the spec parsed and the listener was bound.
 */
declare function bindHotkey(
  spec: string,
  callback: (event: KeyboardEvent) => void,
  options?: {
    signal?: AbortSignal;
  },
): boolean;
export { parseHotkey, matchesHotkey, isEditableTarget, isBareKey, bindHotkey };
export type { Hotkey };
//# sourceMappingURL=hotkeys.d.ts.map
