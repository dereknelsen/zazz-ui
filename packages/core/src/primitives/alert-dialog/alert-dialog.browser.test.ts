"use strict";

/**
 * @fileoverview Alert dialog: a `data-ui="dialog alert-dialog"`
 * token list narrows the dialog and tints its header.
 */

import { describe, expect, it } from "vite-plus/test";
import { atWidth, mount, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-dialog-slot="content"><header data-dialog-slot="header">h</header><div data-dialog-slot="body">b</div></div>`;

describe("alert dialog", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  it("is narrower than a plain dialog and tints the header with the accent", async () => {
    await atWidth(1024);
    const root = mount(`<div>
      <dialog data-ui="dialog" data-plain>${PARTS}</dialog>
      <dialog data-ui="dialog alert-dialog" data-alert>${PARTS}</dialog>
      <div data-accent style="--text: var(--ui-alert-dialog-accent)"></div>
    </div>`);
    const plain = root.querySelector("[data-plain]") as HTMLDialogElement;
    const alert = root.querySelector("[data-alert]") as HTMLDialogElement;
    plain.showModal();
    const plainWidth = Number.parseFloat(style(plain, "inline-size"));
    const plainShadow = style(plain, "box-shadow");
    plain.close();
    alert.showModal();
    expect(Number.parseFloat(style(alert, "inline-size"))).toBeLessThan(plainWidth);
    expect(style(alert, "box-shadow")).not.toBe(plainShadow);
    expect(style(alert.querySelector("[data-dialog-slot='header']")!, "color")).toBe(
      style(root.querySelector("[data-accent]")!, "color"),
    );
    alert.close();
  });
});
