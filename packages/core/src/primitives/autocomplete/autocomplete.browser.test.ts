"use strict";

/**
 * @fileoverview Autocomplete: `data-autocomplete-slot` parts in
 * tag and attribute form, the highlighted item state, and the panel height hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<input data-ui="input" role="combobox" />
  <div data-autocomplete-slot="panel" popover="manual">
    <ul role="listbox" data-autocomplete-slot="list">
      <li role="option" data-autocomplete-slot="item" data-ui="button" data-button-variant="ghost" data-plain>a</li>
      <li role="option" data-autocomplete-slot="item" data-ui="button" data-button-variant="ghost" data-autocomplete-state="highlighted" data-hot>b</li>
    </ul>
  </div>`;

describe("autocomplete", () => {
  useKit();
  useCss(`[data-ui~="button"] { transition: none; }`);

  it("takes a scale number on a tier-only --max-h on the panel", () => {
    const root = mount(`<div style="container-type: inline-size; inline-size: 1200px">
      <ui-autocomplete>
        <input data-ui="input" role="combobox" />
        <div data-autocomplete-slot="panel" popover="manual" style="--max-h--sm: 40"></div>
      </ui-autocomplete>
    </div>`);
    const panel = root.querySelector('[data-autocomplete-slot~="panel"]')!;
    expect(Number.parseFloat(style(panel, "max-block-size"))).toBeCloseTo(scale(40), 1);
  });

  it("styles the panel and the highlighted item in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-autocomplete data-tag>${PARTS}</ui-autocomplete>
      <div data-ui="autocomplete" data-attr>${PARTS}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const panel = root.querySelector(
        `${selector} [data-autocomplete-slot='panel']`,
      ) as HTMLElement;
      panel.showPopover();
      expect(Number.parseFloat(style(panel, "max-block-size")), selector).toBeCloseTo(
        lengthPx("var(--ui-autocomplete-panel-max-h)"),
        1,
      );
      expect(style(panel.querySelector("[data-hot]")!, "background-color"), selector).not.toBe(
        style(panel.querySelector("[data-plain]")!, "background-color"),
      );
      panel.hidePopover();
    }
  });
});
