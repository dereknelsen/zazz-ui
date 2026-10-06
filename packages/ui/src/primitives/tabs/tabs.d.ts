/**
 * @fileoverview `<ui-tabs>` — HTML web component for keyboard-enhanced tabs.
 * @description Light-DOM custom element that augments the CSS-only radio
 * tabs pattern with orientation-aware arrow-key navigation. The element
 * replaces the `.tabs` wrapper `<div>` and carries the same class, so all
 * existing CSS (panel visibility via `:has()`, the anchor-positioned
 * indicator) applies unchanged.
 *
 * Keyboard behavior on the focused tab radio:
 * - Horizontal (default): ArrowLeft / ArrowRight move between tabs.
 * - Vertical (`data-orientation="vertical"`): ArrowUp / ArrowDown move between tabs.
 * - Home / End jump to the first / last enabled tab.
 * - Navigation wraps around and skips disabled tabs.
 *
 * Native radio-group arrow keys already provide a baseline without
 * JavaScript; this element makes the keys match the tabs' visual
 * orientation and adds Home/End + wrap-around.
 *
 * @example
 * <ui-tabs class="tabs">
 *   <div data-slot="tabs-list" role="tablist">
 *     <label data-slot="tabs-label"><input type="radio" name="tg" checked />One</label>
 *     <label data-slot="tabs-label"><input type="radio" name="tg" />Two</label>
 *   </div>
 *   <div data-slot="tabs-panel">…</div>
 *   <div data-slot="tabs-panel">…</div>
 * </ui-tabs>
 */
import { ZazzElement } from "../../base/zazz-element.ts";
declare class UiTabs extends ZazzElement {
  #private;
  protected setup(signal: AbortSignal): void;
}
export { UiTabs };
//# sourceMappingURL=tabs.d.ts.map
