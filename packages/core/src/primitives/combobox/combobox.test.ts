// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the combobox blur and tag-label rules
 * (`primitives/combobox/combobox.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { resolveBlur, resolveRemoveLabel } from "./combobox.ts";

describe("ui-combobox item values", () => {
  it("matches a server-set value against data-combobox-value only", () => {
    // Parse detached: happy-dom connects a custom element before its children
    // are parsed, so setup would see an empty root.
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<ui-combobox>
      <input type="hidden" data-combobox-slot="value" value="jp" />
      <input role="combobox" />
      <div data-combobox-slot="panel" popover="manual">
        <ul role="listbox" data-combobox-slot="list">
          <li role="option" data-combobox-slot="item" data-value="jp">Japan</li>
          <li role="option" data-combobox-slot="item" data-combobox-value="jp">Jamaica</li>
        </ul>
      </div>
    </ui-combobox>`;
    document.body.replaceChildren(wrapper);
    const input = wrapper.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    expect(input.value).toBe("Jamaica");
  });
});

describe("resolveBlur", () => {
  it("reverts stray text to the committed label", () => {
    expect(resolveBlur("Jap", "Japan", false)).toEqual({ value: "Japan", clear: false });
  });

  it("leaves an unchanged committed label alone", () => {
    expect(resolveBlur("Japan", "Japan", false)).toEqual({ value: "Japan", clear: false });
  });

  it("reads an emptied single-select input as a cleared selection", () => {
    expect(resolveBlur("", "Japan", false)).toEqual({ value: "", clear: true });
  });

  it("only drops the filter text in the multiselect variant", () => {
    expect(resolveBlur("des", "", true)).toEqual({ value: "", clear: false });
  });

  it("never clears the multiselect variant's selection on blur", () => {
    expect(resolveBlur("", "", true).clear).toBe(false);
  });
});

describe("resolveRemoveLabel", () => {
  it("fills the label placeholder", () => {
    expect(resolveRemoveLabel("Remove {label}", "Design")).toBe("Remove Design");
  });

  it("honors a custom template", () => {
    expect(resolveRemoveLabel("Dismiss {label} tag", "Design")).toBe("Dismiss Design tag");
  });
});
