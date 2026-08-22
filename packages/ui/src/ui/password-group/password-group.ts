"use strict";

/**
 * @fileoverview `<ui-password>` — HTML web component for password visibility.
 * @description Light-DOM custom element that adds show/hide behavior to a
 * standard password field. Wrap the existing `.password-group` markup — the
 * element finds the input and the `[data-slot="password-group-toggle"]` button, flips the
 * input between `type="password"` and `type="text"` on click, and keeps
 * `aria-pressed` and `aria-label` in sync. The icon swap is pure CSS, driven
 * by `aria-pressed` (see _password-group.css).
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
 * - `data-label-show`: Toggle label while the password is hidden (default "Show password").
 * - `data-label-hide`: Toggle label while the password is visible (default "Hide password").
 *
 * @example
 * <ui-password>
 *   <label class="password-group">
 *     <input class="input" type="password" autocomplete="current-password" />
 *     <span data-slot="password-group-addon" data-align="inline-end">
 *       <button class="button" data-slot="password-group-toggle" type="button"
 *         aria-pressed="false" aria-label="Show password">…</button>
 *     </span>
 *   </label>
 * </ui-password>
 */

import { effect, state } from "../../base/signals.ts";

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
function resolveToggleState(revealed: boolean, labelShow: string, labelHide: string): ToggleState {
  return {
    type: revealed ? "text" : "password",
    ariaPressed: revealed ? "true" : "false",
    ariaLabel: revealed ? labelHide : labelShow,
  };
}

class UiPassword extends HTMLElement {
  #controller: AbortController | null = null;

  connectedCallback() {
    if (this.#controller) return;

    const input = this.querySelector('input[type="password"], input[type="text"]');
    const toggle = this.querySelector('[data-slot="password-group-toggle"]');
    if (!(input instanceof HTMLInputElement) || !(toggle instanceof HTMLElement)) return;

    this.#controller = new AbortController();
    const signal = this.#controller.signal;

    const revealed = state(input.type === "text");

    toggle.addEventListener("click", () => revealed.set(!revealed.get()), { signal });

    effect(
      () => {
        const labelShow = this.getAttribute("data-label-show") || "Show password";
        const labelHide = this.getAttribute("data-label-hide") || "Hide password";
        const next = resolveToggleState(revealed.get(), labelShow, labelHide);
        input.type = next.type;
        toggle.setAttribute("aria-pressed", next.ariaPressed);
        toggle.setAttribute("aria-label", next.ariaLabel);
      },
      { signal },
    );
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
  }
}

// Register the element (guarded against double script loads)
if (typeof window !== "undefined" && !customElements.get("ui-password")) {
  customElements.define("ui-password", UiPassword);
}

// Attach to window for parity with the other component scripts, and export for
// module consumers (loaded for its side effect — the custom-element registration).
if (typeof window !== "undefined") {
  window.UiPassword = UiPassword;
}

// resolveToggleState is exported for unit tests only — not part of the public API.
export { UiPassword, resolveToggleState };
export type { ToggleState };
