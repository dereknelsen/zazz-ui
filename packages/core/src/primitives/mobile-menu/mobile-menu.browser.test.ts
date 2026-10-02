"use strict";

/**
 * @fileoverview The mobile menu: the `data-ui="dialog mobile-menu"`
 * token list lays out its slots, and the slide-right animation preset changes
 * the dialog's motion tokens.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-mobile-menu-slot="viewport">
    <div data-mobile-menu-slot="header">h</div>
    <div data-mobile-menu-slot="body">b</div>
    <div data-mobile-menu-slot="footer">f</div>
  </div>`;

describe("mobile menu", () => {
  useKit();
  useCss(`dialog, dialog *, dialog::backdrop { transition: none; }`);

  it("lays out the viewport slots inside a screen dialog", () => {
    const dialog = mount(
      `<dialog data-ui="dialog mobile-menu" data-dialog-size="screen">${PARTS}</dialog>`,
    ) as HTMLDialogElement;
    dialog.showModal();
    const slot = (name: string) => dialog.querySelector(`[data-mobile-menu-slot='${name}']`)!;
    expect(style(slot("viewport"), "display")).toBe("grid");
    expect(style(slot("header"), "position")).toBe("sticky");
    expect(style(slot("footer"), "position")).toBe("sticky");
    expect(style(slot("body"), "overflow-y")).toBe("auto");
    dialog.close();
  });

  it("the slide-right preset anchors the motion at the left edge", () => {
    const dialog = mount(
      `<dialog data-ui="dialog mobile-menu" data-dialog-size="screen" data-mobile-menu-animation="slide-right">${PARTS}</dialog>`,
    ) as HTMLDialogElement;
    dialog.showModal();
    expect(style(dialog, "transform-origin")).toMatch(/^0px /);
    dialog.close();
  });
});
