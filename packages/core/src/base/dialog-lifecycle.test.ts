// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the dialog lifecycle owner: one watcher
 * re-emitting `<dialog>` visibility as bubbling `zazz:dialog-open` /
 * `zazz:dialog-close` events on the dialog.
 */

import { beforeAll, describe, expect, it } from "vite-plus/test";
import { backdropHit, hasNativeLightDismiss, initDialogLifecycle } from "./dialog-lifecycle.ts";

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

  describe("light dismiss fallback (no closedby support)", () => {
    /** A 200x100 dialog at (100, 100); happy-dom has no layout. */
    function modal(closedby: string | null): HTMLDialogElement {
      const { dialog } = mount();
      if (closedby !== null) dialog.setAttribute("closedby", closedby);
      dialog.setAttribute("open", "");
      dialog.getBoundingClientRect = () =>
        ({ left: 100, top: 100, right: 300, bottom: 200 }) as DOMRect;
      return dialog;
    }

    function press(target: Element, x: number, y: number): void {
      for (const type of ["pointerdown", "pointerup"]) {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
      }
    }

    it("is a fallback: it binds only where closedby='any' round-trips natively", () => {
      const probe = document.createElement("dialog");
      probe.setAttribute("closedby", "any");
      const native = "closedBy" in HTMLDialogElement.prototype && probe.closedBy === "any";
      expect(hasNativeLightDismiss()).toBe(native);
    });

    it("treats Safari 26's partial closedby (none, closerequest) as unsupported", () => {
      const own = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "closedBy");
      Object.defineProperty(HTMLDialogElement.prototype, "closedBy", {
        configurable: true,
        get(this: HTMLDialogElement) {
          const value = this.getAttribute("closedby");
          return value === "none" || value === "closerequest" ? value : "auto";
        },
      });
      try {
        expect(hasNativeLightDismiss()).toBe(false);
      } finally {
        if (own) Object.defineProperty(HTMLDialogElement.prototype, "closedBy", own);
        else delete (HTMLDialogElement.prototype as { closedBy?: unknown }).closedBy;
      }
    });

    it("recognises a backdrop hit: the dialog itself, outside its box", () => {
      const dialog = modal("any");
      const outside = new MouseEvent("click", { clientX: 10, clientY: 10 });
      Object.defineProperty(outside, "target", { value: dialog });
      expect(backdropHit(outside)).toBe(dialog);
      const inside = new MouseEvent("click", { clientX: 150, clientY: 150 });
      Object.defineProperty(inside, "target", { value: dialog });
      expect(backdropHit(inside)).toBeNull();
    });

    it("closes a closedby='any' dialog on a backdrop tap", () => {
      if (hasNativeLightDismiss()) return;
      const dialog = modal("any");
      press(dialog, 10, 10);
      expect(dialog.open).toBe(false);
    });

    it("leaves a tap inside the dialog, and dialogs without closedby='any', alone", () => {
      if (hasNativeLightDismiss()) return;
      const any = modal("any");
      press(any, 150, 150);
      expect(any.open).toBe(true);
      const none = modal("none");
      press(none, 10, 10);
      expect(none.open).toBe(true);
      const unset = modal(null);
      press(unset, 10, 10);
      expect(unset.open).toBe(true);
    });

    it("does not close on a release alone: a drag out of the dialog is not a dismiss", () => {
      if (hasNativeLightDismiss()) return;
      const dialog = modal("any");
      dialog.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, clientX: 150, clientY: 150 }),
      );
      dialog.dispatchEvent(
        new MouseEvent("pointerup", { bubbles: true, clientX: 10, clientY: 10 }),
      );
      expect(dialog.open).toBe(true);
    });
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
