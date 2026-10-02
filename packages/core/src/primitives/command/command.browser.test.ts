"use strict";

/**
 * @fileoverview The command palette: `data-command-slot` parts take
 * the width hook, and the highlighted item state shows.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-command-slot="panel" popover="manual">
    <header data-command-slot="header"><input data-command-slot="input" role="combobox" /></header>
    <div role="listbox" data-command-slot="list">
      <button role="option" data-command-slot="item" data-ui="button" data-button-variant="ghost" data-plain>a</button>
      <button role="option" data-command-slot="item" data-ui="button" data-button-variant="ghost" data-command-state="highlighted" data-hot>b</button>
    </div>
  </div>`;

describe("command", () => {
  useKit();
  useCss(`[data-ui~="button"], [popover] { transition: none; }`);

  it("sizes the panel from the width hook and highlights the active item in both forms", () => {
    const root = mount(`<div>
      <ui-command data-tag>${PARTS}</ui-command>
      <div data-ui="command" data-attr>${PARTS}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const panel = root.querySelector(`${selector} [data-command-slot='panel']`) as HTMLElement;
      panel.showPopover();
      expect(Number.parseFloat(style(panel, "min-inline-size")), selector).toBeCloseTo(
        lengthPx("var(--ui-command-min-w)"),
        1,
      );
      expect(style(panel.querySelector("[data-hot]")!, "background-color"), selector).not.toBe(
        style(panel.querySelector("[data-plain]")!, "background-color"),
      );
      panel.hidePopover();
    }
  });
});
