"use strict";

/**
 * @fileoverview The dialog: `data-dialog-slot` parts lay out the
 * surface, `data-dialog-size="screen"` fills the viewport, and a `--w` utility
 * beats the size hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-dialog-slot="content">
    <header data-dialog-slot="header">h</header>
    <div data-dialog-slot="body">b</div>
    <footer data-dialog-slot="footer">f</footer>
  </div>
  <button data-ui="button" data-dialog-slot="close" type="button">x</button>`;

describe("dialog", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  it("lays out the slots: sticky footer, scrolling body, absolute close", () => {
    const dialog = mount(`<dialog data-ui="dialog">${PARTS}</dialog>`) as HTMLDialogElement;
    dialog.showModal();
    const slot = (name: string) => dialog.querySelector(`[data-dialog-slot='${name}']`)!;
    expect(style(slot("content"), "display")).toBe("grid");
    expect(style(slot("footer"), "position")).toBe("sticky");
    expect(style(slot("body"), "overflow-y")).toBe("auto");
    expect(style(slot("close"), "position")).toBe("absolute");
    dialog.close();
  });

  it("the screen size fills the viewport and a --w utility beats the size hook", () => {
    const root = mount(`<div>
      <dialog data-ui="dialog" data-dialog-size="screen" data-screen>${PARTS}</dialog>
      <dialog data-ui="dialog" data-dialog-size="screen" data-utility style="--w: 333px">${PARTS}</dialog>
    </div>`);
    const screen = root.querySelector("[data-screen]") as HTMLDialogElement;
    const utility = root.querySelector("[data-utility]") as HTMLDialogElement;
    screen.showModal();
    expect(Number.parseFloat(style(screen, "inline-size"))).toBeCloseTo(window.innerWidth, 0);
    expect(style(screen, "border-radius")).toBe("0px");
    screen.close();
    utility.showModal();
    expect(style(utility, "inline-size")).toBe("333px");
    utility.close();
  });
});
