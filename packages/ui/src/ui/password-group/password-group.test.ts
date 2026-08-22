// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the password toggle's pure derivation
 * (`resolveToggleState`) — the effect in `password-group.ts` just writes
 * whatever this function returns.
 */

import { describe, expect, it } from "vite-plus/test";
import { resolveToggleState } from "./password-group.ts";

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
