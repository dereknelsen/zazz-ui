"use strict";

/**
 * @fileoverview `<input-password>` — HTML web component for password visibility.
 * @description Light-DOM custom element that adds show/hide behavior to a
 * standard password field. Wrap the existing `.password-group` markup — the
 * element finds the input and the `.password-group__toggle` button, flips the
 * input between `type="password"` and `type="text"` on click, and keeps
 * `aria-pressed` and `aria-label` in sync. The icon swap is pure CSS, driven
 * by `aria-pressed` (see _password-group.css).
 *
 * Without JavaScript the field degrades to a regular password input; the
 * toggle button simply does nothing.
 *
 * Configuration (attributes on `<input-password>`):
 * - `label-show`: Toggle label while the password is hidden (default "Show password").
 * - `label-hide`: Toggle label while the password is visible (default "Hide password").
 *
 * @example
 * <input-password>
 *   <label class="password-group">
 *     <input class="input" type="password" autocomplete="current-password" />
 *     <span class="password-group__addon" data-align="inline-end">
 *       <button class="button password-group__toggle" type="button"
 *         aria-pressed="false" aria-label="Show password">…</button>
 *     </span>
 *   </label>
 * </input-password>
 */

class InputPassword extends HTMLElement {
  #controller: AbortController | null = null;

  connectedCallback() {
    if (this.#controller) return;

    const input = this.querySelector('input[type="password"], input[type="text"]');
    const toggle = this.querySelector(".password-group__toggle");
    if (!(input instanceof HTMLInputElement) || !(toggle instanceof HTMLElement)) return;

    this.#controller = new AbortController();

    toggle.addEventListener(
      "click",
      () => {
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        toggle.setAttribute("aria-pressed", String(reveal));
        toggle.setAttribute(
          "aria-label",
          reveal
            ? this.getAttribute("label-hide") || "Hide password"
            : this.getAttribute("label-show") || "Show password",
        );
      },
      { signal: this.#controller.signal },
    );
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
  }
}

// Register the element (guarded against double script loads)
if (typeof window !== "undefined" && !customElements.get("input-password")) {
  customElements.define("input-password", InputPassword);
}

// Attach to window for parity with the other component scripts, and export for
// module consumers (loaded for its side effect — the custom-element registration).
if (typeof window !== "undefined") {
  window.InputPassword = InputPassword;
}

export { InputPassword };
