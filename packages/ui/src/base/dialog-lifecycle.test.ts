// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the dialog lifecycle owner (ADR-0003): one watcher
 * re-emitting `<dialog>` visibility as bubbling `zazz:dialog-open` /
 * `zazz:dialog-close` events on the dialog.
 */

import { beforeAll, describe, expect, it } from "vite-plus/test";
import { initDialogLifecycle } from "./dialog-lifecycle.ts";

/** MutationObserver callbacks are microtasks: flush them. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function mount(): { wrapper: HTMLDivElement; dialog: HTMLDialogElement } {
  const wrapper = document.createElement("div");
  const dialog = document.createElement("dialog");
  wrapper.append(dialog);
  document.body.append(wrapper);
  return { wrapper, dialog };
}

describe("initDialogLifecycle", () => {
  beforeAll(() => {
    initDialogLifecycle();
  });

  it("emits zazz:dialog-open on the dialog when the open attribute is added", async () => {
    const { dialog } = mount();
    let count = 0;
    dialog.addEventListener("zazz:dialog-open", () => count++);

    dialog.setAttribute("open", "");
    await flush();

    expect(count).toBe(1);
  });

  it("bubbles zazz:dialog-open to ancestors with the dialog as target", async () => {
    const { wrapper, dialog } = mount();
    let target: EventTarget | null = null;
    wrapper.addEventListener("zazz:dialog-open", (e) => {
      target = e.target;
    });

    dialog.setAttribute("open", "");
    await flush();

    expect(target).toBe(dialog);
  });

  it("does not emit when the open attribute is removed", async () => {
    const { dialog } = mount();
    dialog.setAttribute("open", "");
    await flush();

    let count = 0;
    dialog.addEventListener("zazz:dialog-open", () => count++);
    dialog.removeAttribute("open");
    await flush();

    expect(count).toBe(0);
  });

  it("re-emits the non-bubbling native close as a bubbling zazz:dialog-close", async () => {
    const { wrapper, dialog } = mount();
    let target: EventTarget | null = null;
    wrapper.addEventListener("zazz:dialog-close", (e) => {
      target = e.target;
    });

    // Native close does not bubble; the document-level capture listener
    // re-emits it as a bubbling event.
    dialog.dispatchEvent(new Event("close"));

    expect(target).toBe(dialog);
  });

  it("is idempotent: a second init does not double-emit", async () => {
    initDialogLifecycle();
    const { dialog } = mount();
    let count = 0;
    dialog.addEventListener("zazz:dialog-open", () => count++);

    dialog.setAttribute("open", "");
    await flush();

    expect(count).toBe(1);
  });
});
