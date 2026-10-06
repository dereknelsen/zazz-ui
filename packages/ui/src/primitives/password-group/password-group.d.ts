import { ZazzElement } from "../../base/zazz-element.ts";
/** Derived DOM state for one toggle configuration. */
interface ToggleState {
  type: "password" | "text";
  ariaPressed: "true" | "false";
  ariaLabel: string;
}
/**
 * @description Derives the input type, `aria-pressed`, and `aria-label` for a
 * given reveal state. Pure — the effect in `connectedCallback` is the only
 * place that writes it to the DOM.
 *
 * @param revealed - Whether the password is currently shown as plain text.
 * @param labelShow - Toggle label while hidden.
 * @param labelHide - Toggle label while revealed.
 * @returns The derived DOM state.
 * @private
 */
declare function resolveToggleState(
  revealed: boolean,
  labelShow: string,
  labelHide: string,
): ToggleState;
declare class UiPassword extends ZazzElement {
  protected setup(signal: AbortSignal): void;
}
export { UiPassword, resolveToggleState };
export type { ToggleState };
//# sourceMappingURL=password-group.d.ts.map
