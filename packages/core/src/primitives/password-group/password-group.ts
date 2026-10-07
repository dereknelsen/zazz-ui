"use strict";

/**
 * @fileoverview `<ui-password>`: HTML web component for password visibility.
 * @description Light-DOM custom element that adds show/hide behavior to a
 * standard password field. Wrap the existing `.password-group` markup: the
 * element finds the input and the `[data-password-group-slot~="toggle"]` button, flips the
 * input between `type="password"` and `type="text"` on click, and keeps
 * `aria-pressed` and `aria-label` in sync. The icon swap is pure CSS, driven
 * by `aria-pressed` (see password-group.css).
 *
 * The revealed/hidden state is a signal (`base/signals.ts`): the click handler
 * is the input adapter, `resolveToggleState` is the pure derivation, and one
 * effect is the output adapter that writes `type`, `aria-pressed`, and
 * `aria-label` together. The effect also runs once on connect, so the toggle
 * self-corrects to match the input's actual starting type even if the
 * markup's static attributes drift from it.
 *
 * Without JavaScript the field degrades to a regular password input; the
 * toggle button simply does nothing.
 *
 * Configuration (attributes on `<ui-password>`):
 * - `data-password-group-label-show`: Toggle label while the password is hidden (default "Show password").
 * - `data-password-group-label-hide`: Toggle label while the password is visible (default "Hide password").
 *
 * @example
 * <ui-password>
 *   <label data-ui="password-group">
 *     <input data-ui="input" type="password" autocomplete="current-password" />
 *     <span data-password-group-slot="addon" data-password-group-align="inline-end">
 *       <button data-ui="button" data-password-group-slot="toggle" type="button"
 *         aria-pressed="false" aria-label="Show password">…</button>
 *     </span>
 *   </label>
 * </ui-password>
 */

import { effect, state } from "../../base/signals.ts";
import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";

/** Derived DOM state for one toggle configuration. */
interface ToggleState {
  type: "password" | "text";
  ariaPressed: "true" | "false";
  ariaLabel: string;
}

/**
 * @description Derives the input type, `aria-pressed`, and `aria-label` for a
 * given reveal state. Pure: the effect in `connectedCallback` is the only
 * place that writes it to the DOM.
 *
 * @param revealed - Whether the password is currently shown as plain text.
 * @param labelShow - Toggle label while hidden.
 * @param labelHide - Toggle label while revealed.
 * @returns The derived DOM state.
 * @private
 */
function resolveToggleState(revealed: boolean, labelShow: string, labelHide: string): ToggleState {
  return {
    type: revealed ? "text" : "password",
    ariaPressed: revealed ? "true" : "false",
    ariaLabel: revealed ? labelHide : labelShow,
  };
}

class UiPassword extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const input = this.querySelector('input[type="password"], input[type="text"]');
    const toggle = this.querySelector('[data-password-group-slot~="toggle"]');
    if (!(input instanceof HTMLInputElement) || !(toggle instanceof HTMLElement)) return;

    const revealed = state(input.type === "text");

    toggle.addEventListener("click", () => revealed.set(!revealed.get()), { signal });

    effect(
      () => {
        const labelShow = this.getAttribute("data-password-group-label-show") || "Show password";
        const labelHide = this.getAttribute("data-password-group-label-hide") || "Hide password";
        const next = resolveToggleState(revealed.get(), labelShow, labelHide);
        input.type = next.type;
        toggle.setAttribute("aria-pressed", next.ariaPressed);
        toggle.setAttribute("aria-label", next.ariaLabel);
      },
      { signal },
    );
  }
}

defineZazzElement("ui-password", UiPassword);

export { UiPassword, resolveToggleState };
export type { ToggleState };
