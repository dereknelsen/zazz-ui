"use strict";

/**
 * @fileoverview The command palette: `data-command-slot` parts take
 * the width hook, and the highlighted item state shows.
 */

import { describe, expect, it } from "vite-plus/test";
import { commands, server } from "vite-plus/test/browser/context";
import { atWidth, below, lengthPx, mount, style, useCss, useKit } from "../../../test/browser.ts";

const held = commands as unknown as { emulateTouch(enabled: boolean): Promise<void> };

/** The dialog form: command slots beside the dialog slots, so dialog.css owns the layout. */
const DIALOG = `<dialog data-ui="dialog" data-command-slot="panel">
    <div data-dialog-slot="content">
      <header data-command-slot="header" data-dialog-slot="header"><input data-command-slot="input" role="combobox" /></header>
      <div role="listbox" data-command-slot="list" data-dialog-slot="body">
        <button role="option" data-command-slot="item" data-ui="button" data-button-variant="ghost">a</button>
      </div>
      <footer data-command-slot="footer" data-dialog-slot="footer">hint</footer>
    </div>
  </dialog>`;

const PARTS = `<div data-command-slot="panel" popover="manual">
    <header data-command-slot="header"><input data-command-slot="input" role="combobox" /></header>
    <div role="listbox" data-command-slot="list">
      <button role="option" data-command-slot="item" data-ui="button" data-button-variant="ghost" data-plain>a</button>
      <button role="option" data-command-slot="item" data-ui="button" data-button-variant="ghost" data-command-state="highlighted" data-hot>b</button>
    </div>
  </div>`;

describe("command", () => {
  useKit();
  useCss(`[data-ui~="button"], [popover], dialog, dialog::backdrop { transition: none; }`);

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

  it("the dialog form keeps the dialog's grid and scrolls in the list", () => {
    const root = mount(`<ui-command>${DIALOG}</ui-command>`);
    const dialog = root.querySelector("dialog")!;
    dialog.showModal();
    expect(style(dialog, "display")).toBe("grid");
    expect(style(dialog.querySelector("[data-command-slot~='list']")!, "overflow-y")).toBe("auto");
    expect(style(dialog.querySelector("[data-command-slot~='footer']")!, "justify-content")).toBe(
      "flex-start",
    );
    dialog.close();
  });

  // Touch emulation is a CDP session: Chromium only.
  it.skipIf(server.browser !== "chromium")(
    "on a phone the dialog form fills the screen and the footer sits at the bottom",
    async () => {
      await atWidth(below("sm"));
      await held.emulateTouch(true);
      try {
        const root = mount(`<ui-command>${DIALOG}</ui-command>`);
        const dialog = root.querySelector("dialog")!;
        dialog.showModal();
        const box = dialog.getBoundingClientRect();
        expect(box.height).toBeCloseTo(window.innerHeight, 0);
        const footer = dialog.querySelector("[data-command-slot~='footer']")!;
        // within the 1px border, transparent on a phone but still laid out
        expect(Math.abs(footer.getBoundingClientRect().bottom - box.bottom)).toBeLessThan(1.5);
        dialog.close();
      } finally {
        await held.emulateTouch(false);
      }
    },
  );
});
