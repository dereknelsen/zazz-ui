/**
 * @fileoverview `<ui-menu>` — HTML web component for keyboard-enhanced menus.
 * @description Light-DOM custom element that augments the CSS-only menu
 * pattern (trigger + anchored `[data-slot~="menu-popover"]` panel) with
 * arrow-key navigation. The class form `.ui-menu` stays fully functional
 * without JavaScript — the Popover API provides open/close, light dismiss,
 * and focus return on its own.
 *
 * Keyboard behavior:
 * - ArrowDown / ArrowUp on the closed trigger open the panel and focus the
 *   first / last item.
 * - ArrowDown / ArrowUp inside the open panel move focus between items,
 *   wrapping around and skipping disabled items.
 * - Home / End jump to the first / last item.
 * - Escape and light dismiss are native Popover API behavior — no code here.
 *
 * The menu keeps the honest disclosure posture: items are plain links and
 * buttons, and no `role="menu"` is claimed. Add the full ARIA menu contract
 * yourself only if every item is an action and you implement the rest of the
 * pattern (typeahead, close-on-activate).
 *
 * @example
 * <ui-menu>
 *   <button class="ui-button" type="button" popovertarget="m1">Open</button>
 *   <div id="m1" data-slot="menu-popover" popover="auto">
 *     <menu>
 *       <li><a href="/docs" class="ui-button justify-start" data-variant="ghost">Docs</a></li>
 *     </menu>
 *   </div>
 * </ui-menu>
 */
import { ZazzElement } from "../../base/zazz-element.ts";
declare class UiMenu extends ZazzElement {
  #private;
  protected setup(signal: AbortSignal): void;
}
export { UiMenu };
//# sourceMappingURL=menu.d.ts.map
