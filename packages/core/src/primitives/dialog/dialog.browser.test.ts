"use strict";

/**
 * @fileoverview The dialog: `data-dialog-slot` parts lay out the
 * surface, `data-dialog-size="bleed"` fills the viewport, the band sizes cap the width, and a `--w` utility
 * beats the size hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { initDialogLifecycle } from "../../base/dialog-lifecycle.ts";
import { atWidth, mount, scale, style, useCss, useKit } from "../../../test/browser.ts";

const PARTS = `<div data-dialog-slot="content">
    <header data-dialog-slot="header">h</header>
    <div data-dialog-slot="body">b</div>
    <footer data-dialog-slot="footer">f</footer>
  </div>
  <button data-ui="button" data-dialog-slot="close" type="button">x</button>`;

describe("dialog", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  it("sizes to its content by default, and a tier-only --h takes a scale number, a length, or a percentage", async () => {
    await atWidth(1440);
    const root =
      mount(`<div style="container-type: inline-size; inline-size: 1200px; block-size: 800px">
      <dialog data-ui="dialog" open data-default>d</dialog>
      <dialog data-ui="dialog" open data-scale style="--h--sm: 40">d</dialog>
      <dialog data-ui="dialog" open data-length style="--h--sm: 120px">d</dialog>
      <dialog data-ui="dialog" open data-percent style="--h--sm: 50%">d</dialog>
    </div>`);
    const height = (selector: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, "block-size"));
    expect(height("[data-default]")).toBeGreaterThan(0);
    expect(height("[data-default]")).toBeLessThan(scale(40));
    expect(height("[data-scale]")).toBeCloseTo(scale(40), 1);
    expect(height("[data-length]")).toBeCloseTo(120, 1);
    expect(height("[data-percent]")).toBeGreaterThan(height("[data-default]"));
  });

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

  it("the bleed size fills the viewport and a --w utility beats the size hook", () => {
    const root = mount(`<div>
      <dialog data-ui="dialog" data-dialog-size="bleed" data-bleed>${PARTS}</dialog>
      <dialog data-ui="dialog" data-dialog-size="bleed" data-utility style="--w: 333px">${PARTS}</dialog>
    </div>`);
    const bleed = root.querySelector("[data-bleed]") as HTMLDialogElement;
    const utility = root.querySelector("[data-utility]") as HTMLDialogElement;
    bleed.showModal();
    expect(Number.parseFloat(style(bleed, "inline-size"))).toBeCloseTo(window.innerWidth, 0);
    expect(style(bleed, "border-radius")).toBe("0px");
    bleed.close();
    utility.showModal();
    expect(style(utility, "inline-size")).toBe("333px");
    utility.close();
  });

  it("the lifecycle script records the scroll offset on the body while a modal is open", async () => {
    initDialogLifecycle();
    const dialog = mount(`<dialog data-ui="dialog">d</dialog>`) as HTMLDialogElement;
    dialog.showModal();
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    await tick(); // the open event is a microtask
    expect(document.body.style.getPropertyValue("--_scroll-y")).toBe(`${window.scrollY}px`);
    dialog.close();
    await tick(); // the native close event is a queued task
    expect(document.body.style.getPropertyValue("--_scroll-y")).toBe("");
  });

  it("sm … 2xl follow the layout bands, capped by the viewport; full spans inside the gutters", async () => {
    // wide enough that sm … xl each fit and 2xl meets the viewport cap
    await atWidth(1440);
    const sizes = ["sm", "md", "lg", "xl", "2xl", "full"];
    const root = mount(
      `<div>${sizes.map((s) => `<dialog data-ui="dialog" data-dialog-size="${s}" data-size="${s}">${PARTS}</dialog>`).join("")}<dialog data-ui="dialog" data-default>${PARTS}</dialog></div>`,
    );
    /** A length measured from a probe, so the expectations read the same tokens. */
    const measure = (css: string) => {
      const probe = document.createElement("div");
      probe.style.cssText = `position: absolute; inline-size: ${css}`;
      document.body.append(probe);
      const px = probe.getBoundingClientRect().width;
      probe.remove();
      return px;
    };
    const width = (selector: string) => {
      const dialog = root.querySelector(selector) as HTMLDialogElement;
      dialog.showModal();
      const value = dialog.getBoundingClientRect().width;
      dialog.close();
      return value;
    };
    const room = measure("calc(100vi - var(--gutters) * 2)");
    for (const size of ["sm", "md", "lg", "xl", "2xl"]) {
      const band = Math.min(measure(`var(--layout-${size})`), room);
      expect(width(`[data-size="${size}"]`), size).toBeCloseTo(band, 0);
    }
    expect(width("[data-default]")).toBeCloseTo(width('[data-size="sm"]'), 0);
    expect(width('[data-size="full"]')).toBeCloseTo(room, 0);
    expect(width('[data-size="lg"]')).toBeGreaterThan(width('[data-size="md"]'));
  });
});
