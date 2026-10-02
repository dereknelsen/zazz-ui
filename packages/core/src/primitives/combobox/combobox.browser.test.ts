"use strict";

/**
 * @fileoverview Combobox: `data-combobox-slot` parts, the
 * multiselect variant wrapping the control, and the highlighted item state.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-combobox-slot="control"><input role="combobox" /><button data-combobox-slot="trigger" type="button"></button></div>
  <div data-combobox-slot="panel" popover="manual">
    <ul role="listbox" data-combobox-slot="list">
      <li role="option" data-combobox-slot="item" data-ui="button" data-button-variant="ghost" data-plain>a</li>
      <li role="option" data-combobox-slot="item" data-ui="button" data-button-variant="ghost" data-combobox-state="highlighted" data-hot>b</li>
    </ul>
  </div>`;

describe("combobox", () => {
  useKit();
  useCss(`[data-ui~="button"], [data-combobox-slot] { transition: none; }`);

  it("sizes the control from the field height and highlights the active item", () => {
    const root = mount(`<div>
      <ui-combobox data-tag>${PARTS}</ui-combobox>
      <div data-ui="combobox" data-attr>${PARTS}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const control = root.querySelector(`${selector} [data-combobox-slot='control']`)!;
      expect(Number.parseFloat(style(control, "block-size")), selector).toBeCloseTo(
        lengthPx("var(--ui-field-h)"),
        1,
      );
      const panel = root.querySelector(`${selector} [data-combobox-slot='panel']`) as HTMLElement;
      panel.showPopover();
      expect(style(panel.querySelector("[data-hot]")!, "background-color"), selector).not.toBe(
        style(panel.querySelector("[data-plain]")!, "background-color"),
      );
      panel.hidePopover();
    }
  });

  it("the multiselect variant lets the control wrap", () => {
    const root = mount(`<ui-combobox data-combobox-variant="multiselect">${PARTS}</ui-combobox>`);
    expect(style(root.querySelector("[data-combobox-slot='control']")!, "flex-wrap")).toBe("wrap");
  });
});
