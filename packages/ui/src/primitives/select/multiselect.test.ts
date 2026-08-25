// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the multiselect trigger label (`primitives/select/multiselect.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { resolveTriggerLabel } from "./multiselect.ts";

describe("resolveTriggerLabel", () => {
  it("shows the placeholder for an empty selection", () => {
    expect(resolveTriggerLabel([], "Select tags", "(+{n} more)")).toBe("Select tags");
  });

  it("shows a single selection plainly", () => {
    expect(resolveTriggerLabel(["Design"], "Select tags", "(+{n} more)")).toBe("Design");
  });

  it("summarizes multiple selections as first (+N more)", () => {
    expect(
      resolveTriggerLabel(["Design", "Engineering", "Research"], "Select tags", "(+{n} more)"),
    ).toBe("Design (+2 more)");
  });

  it("honors a custom overflow template", () => {
    expect(resolveTriggerLabel(["A", "B"], "Pick", "and {n} other")).toBe("A and 1 other");
  });
});
