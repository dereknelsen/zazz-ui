/**
 * @fileoverview `<ui-command>` — a command menu for search and quick actions.
 * @description Light-DOM custom element on the shared typeahead engine
 * (`base/typeahead.ts`), architected after cmdk. The panel — a `popover="auto"`
 * dropdown or a `<dialog class="ui-dialog">` — contains the search input;
 * items rank by match score and the best match auto-highlights.
 *
 * Actions are the platform's own vocabulary: navigation items are real
 * `<a href>` links, and action items are `<button command commandfor>` invoker
 * buttons (including custom `--commands`). Enter activates the highlighted
 * item exactly as a click would; every activation also dispatches a bubbling
 * `zazz:command-select` CustomEvent (`detail: { item, value }`) from the root.
 * Without JavaScript the trigger still opens the panel natively and every
 * item still works — only filtering, highlight, and hotkeys are lost.
 *
 * Attributes:
 * - `data-command-hotkey` (root) — global toggle shortcut, e.g. `"mod+k"`.
 * - `data-hotkey` (item) — global accelerator that activates the item, active
 *   while the element is connected (even with the panel closed).
 * - `data-stay-open` (item) — keep the panel open after activation.
 * - `data-sort="document"` (root) — opt out of score ranking (default: score).
 *
 * Parts: `command-open` (trigger), `command-panel`, `command-header`,
 * `command-input`, `command-list`, `command-group` / `command-group-label`,
 * `command-item` (`data-value`, `data-keywords`), `command-kbd`,
 * `command-footer`, `command-empty`.
 *
 * For complex custom actions, see the example `command-actions.ts` — listen
 * for your `--command` on its target, or for `zazz:command-select` on the root.
 */
import { TypeaheadElement } from "../../base/typeahead.ts";
declare class UiCommand extends TypeaheadElement {
  #private;
  protected readonly slotPrefix = "command";
  protected readonly managesPanel: boolean;
  protected readonly autoHighlight: boolean;
  /** Command ranks by score unless the author opts back into DOM order. */
  protected get sortByScore(): boolean;
  protected setup(signal: AbortSignal): void;
  /**
   * @description A pointer commit has already run the item's native activation
   * (link navigation, invoker command); a keyboard commit runs it via
   * `click()`. Both announce `zazz:command-select` and close the panel unless
   * the item asks to stay open.
   *
   * @param item - The activated item.
   * @param source - How the commit happened.
   */
  protected commit(item: HTMLElement, source: "keyboard" | "pointer"): void;
}
export { UiCommand };
//# sourceMappingURL=command.d.ts.map
