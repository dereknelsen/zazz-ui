// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the password toggle's pure derivation
 * (`resolveToggleState`) — the effect in `password-group.ts` just writes
 * whatever this function returns — and the labels `<ui-password>` reads.
 */

import { describe, expect, it } from "vite-plus/test";
import { resolveToggleState } from "./password-group.ts";

/** Lets the signal graph drain its queued microtask. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("resolveToggleState", () => {
  it("masks the input and shows the reveal label when hidden", () => {
    expect(resolveToggleState(false, "Show password", "Hide password")).toEqual({
      type: "password",
      ariaPressed: "false",
      ariaLabel: "Show password",
    });
  });

  it("reveals plain text and shows the hide label when revealed", () => {
    expect(resolveToggleState(true, "Show password", "Hide password")).toEqual({
      type: "text",
      ariaPressed: "true",
      ariaLabel: "Hide password",
    });
  });

  it("uses the caller-provided labels verbatim", () => {
    expect(resolveToggleState(false, "Mostrar", "Ocultar").ariaLabel).toBe("Mostrar");
    expect(resolveToggleState(true, "Mostrar", "Ocultar").ariaLabel).toBe("Ocultar");
  });
});

describe("<ui-password> labels", () => {
  async function toggleLabel(attrs: string): Promise<string | null> {
    // Parse detached: happy-dom connects a custom element before its children exist.
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<ui-password ${attrs}><input type="password" /><button data-password-group-slot="toggle"></button></ui-password>`;
    document.body.replaceChildren(wrapper);
    await flush();
    const label = wrapper.querySelector("button")!.getAttribute("aria-label");
    document.body.replaceChildren();
    return label;
  }

  it("reads the scoped label and ignores the unprefixed one", async () => {
    expect(await toggleLabel('data-password-group-label-show="Mostrar"')).toBe("Mostrar");
    expect(await toggleLabel('data-label-show="Legacy"')).toBe("Show password");
  });
});
