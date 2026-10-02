"use strict";

/**
 * @fileoverview The field wrapper: `data-field-slot` parts take their
 * grid rows, the hint/error crossfade follows `:user-invalid`, and `data-field-orientation="horizontal"`
 * lays the control beside its label.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const FIELD = `<div data-ui="field">
  <label data-field-slot="label" for="f">Email</label>
  <input id="f" type="email" required />
  <div data-field-slot="description">
    <span data-field-slot="hint">We never share it.</span>
    <span data-field-slot="error">Enter a valid address.</span>
  </div>
</div>`;

describe("field slots and validation", () => {
  useKit();
  useCss(`[data-field-slot] { transition: none; }`);

  it("places label, control, and description on grid rows 1, 2, and 3", () => {
    const root = mount(FIELD);
    const row = (selector: string) => style(root.querySelector(selector)!, "grid-row-start");
    expect(style(root, "display")).toBe("grid");
    expect(row("[data-field-slot='label']")).toBe("1");
    expect(row("input")).toBe("2");
    expect(row("[data-field-slot='description']")).toBe("3");
  });

  it("shows the hint until the user commits an invalid value, then the error", async () => {
    const root = mount(FIELD);
    const visibility = (selector: string) => style(root.querySelector(selector)!, "visibility");
    expect(visibility("[data-field-slot='hint']")).toBe("visible");
    expect(visibility("[data-field-slot='error']")).toBe("hidden");
    await userEvent.click(root.querySelector("input")!);
    await userEvent.keyboard("nope");
    await userEvent.tab();
    expect(visibility("[data-field-slot='hint']")).toBe("hidden");
    expect(visibility("[data-field-slot='error']")).toBe("visible");
  });

  it("lays a horizontal field out as a flex row", () => {
    const root = mount(`<label data-ui="field" data-field-orientation="horizontal">
      <input type="checkbox" />
      <span data-field-slot="label">Subscribe</span>
    </label>`);
    expect(style(root, "display")).toBe("flex");
    expect(style(root, "flex-direction")).toBe("row");
  });
});
