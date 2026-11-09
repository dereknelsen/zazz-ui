"use strict";

/**
 * @fileoverview The mobile menu: the `data-ui="dialog mobile-menu"`
 * token list lays out its slots, and the slide-right animation preset changes
 * the dialog's motion tokens.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-mobile-menu-slot="viewport" data-dialog-slot="content">
    <div data-mobile-menu-slot="header" data-dialog-slot="header">h</div>
    <div data-mobile-menu-slot="body" data-dialog-slot="body">b</div>
    <div data-mobile-menu-slot="footer" data-dialog-slot="footer">f</div>
  </div>`;

describe("mobile menu", () => {
  useKit();
  useCss(`dialog, dialog *, dialog::backdrop { transition: none; }`);

  it("lays out the viewport slots inside a screen dialog", () => {
    const dialog = mount(
      `<dialog data-ui="dialog mobile-menu" data-dialog-size="bleed">${PARTS}</dialog>`,
    ) as HTMLDialogElement;
    dialog.showModal();
    const slot = (name: string) => dialog.querySelector(`[data-mobile-menu-slot='${name}']`)!;
    // the dialog's content slot supplies the grid; the body is the scroller; the
    // footer reaches the bottom of the full-height dialog
    expect(style(slot("viewport"), "display")).toBe("grid");
    expect(style(slot("body"), "overflow-y")).toBe("auto");
    expect(
      Math.abs(
        slot("footer").getBoundingClientRect().bottom - dialog.getBoundingClientRect().bottom,
      ),
    ).toBeLessThan(1.5);
    dialog.close();
  });

  it("the slide-right preset anchors the motion at the left edge", () => {
    const dialog = mount(
      `<dialog data-ui="dialog mobile-menu" data-dialog-size="bleed" data-mobile-menu-animation="slide-right">${PARTS}</dialog>`,
    ) as HTMLDialogElement;
    dialog.showModal();
    expect(style(dialog, "transform-origin")).toMatch(/^0px /);
    dialog.close();
  });

  it("the slide-right preset mirrors to the right edge in RTL", () => {
    const dialog = mount(
      `<dialog dir="rtl" data-ui="dialog mobile-menu" data-dialog-size="bleed" data-mobile-menu-animation="slide-right">${PARTS}</dialog>`,
    ) as HTMLDialogElement;
    dialog.showModal();
    const [x] = style(dialog, "transform-origin").split(" ").map(Number.parseFloat);
    expect(x).toBeCloseTo(dialog.getBoundingClientRect().width, 0);
    dialog.close();
  });
});
