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

describe("ui-combobox value property", () => {
  const mount = () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<form><ui-combobox>
      <input type="hidden" name="country" data-combobox-slot="value" value="" />
      <input role="combobox" />
      <div data-combobox-slot="panel" popover="manual">
        <ul role="listbox" data-combobox-slot="list">
          <li role="option" data-combobox-slot="item" data-combobox-value="jp">Japan</li>
          <li role="option" data-combobox-slot="item" data-combobox-value="nz">New Zealand</li>
        </ul>
      </div>
    </ui-combobox></form>`;
    document.body.replaceChildren(wrapper);
    return {
      combobox: wrapper.querySelector("ui-combobox")! as HTMLElement & { value: string },
      hidden: wrapper.querySelector<HTMLInputElement>("input[type=hidden]")!,
      input: wrapper.querySelector<HTMLInputElement>('input[role="combobox"]')!,
    };
  };

  it("reads the empty string when nothing is selected", () => {
    expect(mount().combobox.value).toBe("");
  });

  it("selects a row by form value without dispatching change", () => {
    const { combobox, hidden, input } = mount();
    let changes = 0;
    hidden.addEventListener("change", () => changes++);
    combobox.value = "nz";
    expect(combobox.value).toBe("nz");
    expect(hidden.value).toBe("nz");
    expect(input.value).toBe("New Zealand");
    expect(
      combobox.querySelector('[data-combobox-value="nz"]')?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(changes).toBe(0);
  });

  it("clears the selection for a value no row carries", () => {
    const { combobox, hidden, input } = mount();
    combobox.value = "jp";
    combobox.value = "xx";
    expect(combobox.value).toBe("");
    expect(hidden.value).toBe("");
    expect(input.value).toBe("");
    expect(combobox.querySelector("[aria-selected]")).toBeNull();
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
