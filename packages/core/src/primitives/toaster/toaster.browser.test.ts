"use strict";

/**
 * @fileoverview The toaster: `data-toaster-slot` parts in tag and
 * attribute form, the variant accent on a toast, the position preset, and the
 * `--toast` invoker's `data-toaster-*` content attributes, and swipe-to-dismiss.
 */

import { describe, expect, it } from "vite-plus/test";
import { frame, mount, style, useCss, useKit } from "../../../test/browser.ts";
import { drag, pointerUp } from "../../../test/pointer.ts";
import "./toaster.ts";

const LIST = `<ol data-toaster-slot="list">
    <li data-toaster-slot="toast" data-toaster-state="front visible" data-plain><div data-toaster-slot="content"><div data-toaster-slot="title">t</div></div></li>
    <li data-toaster-slot="toast" data-toaster-state="front visible" data-toaster-variant="success" data-success><div data-toaster-slot="content"><div data-toaster-slot="title">t</div></div></li>
  </ol>`;

describe("toaster", () => {
  useKit();
  useCss(`[data-toaster-slot] { transition: none; }`);

  it("styles toasts and the success accent in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-toaster data-tag popover="manual">${LIST}</ui-toaster>
      <div data-ui="toaster" data-attr popover="manual">${LIST}</div>
      <div data-success-color style="--text: var(--color-success-foreground)"></div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const region = root.querySelector(selector) as HTMLElement;
      region.showPopover();
      const plain = region.querySelector("[data-plain]")!;
      const success = region.querySelector("[data-success]")!;
      expect(style(plain, "position"), selector).toBe("absolute");
      expect(style(success, "--ui-toaster-accent").trim(), selector).toBe(
        style(root.querySelector("[data-success-color]")!, "--text").trim(),
      );
      region.hidePopover();
    }
  });

  it("a --toast invoker reads its content from data-toaster-* attributes", async () => {
    const root = mount(`<div>
      <ui-toaster id="invoker-toaster" popover="manual"></ui-toaster>
      <button type="button" commandfor="invoker-toaster" command="--toast"
        data-toaster-title="Saved" data-toaster-description="All good"
        data-toaster-variant="warning" data-toaster-close-button="false">Save</button>
      <button type="button" commandfor="invoker-toaster" command="--toast"
        data-title="Unprefixed">Old</button>
    </div>`);
    const [prefixed, unprefixed] = root.querySelectorAll("button");
    prefixed.click();
    unprefixed.click();
    await frame();
    const toasts = root.querySelectorAll('[data-toaster-slot~="toast"]');
    expect(toasts).toHaveLength(2);
    const [first, second] = toasts;
    expect(first.querySelector('[data-toaster-slot="title"]')?.textContent).toBe("Saved");
    expect(first.querySelector('[data-toaster-slot="description"]')?.textContent).toBe("All good");
    expect(first.getAttribute("data-toaster-variant")).toBe("warning");
    expect(first.querySelector('[data-toaster-slot="close"]')).toBeNull();
    expect(second.querySelector('[data-toaster-slot="title"]')).toBeNull();
    (root.querySelector("ui-toaster") as HTMLElement & { dismissAll(): void }).dismissAll();
  });

  it("the top position preset flips the stack", () => {
    const region = mount(
      `<ui-toaster popover="manual" data-toaster-position="top-end">${LIST}</ui-toaster>`,
    ) as HTMLElement;
    region.showPopover();
    // the top preset lifts the stack (the insets compute to used pixel values)
    expect(style(region, "--_lift").trim()).toBe("1");
    region.hidePopover();
  });

  describe("swipe to dismiss", () => {
    type Region = HTMLElement & {
      addToast(options: { title: string; duration?: number }): string;
      dismissAll(): void;
    };

    /** A region with one persistent toast (transitions are off in this file). */
    const withToast = (position?: string, duration = Infinity) => {
      const region = mount(
        `<ui-toaster popover="manual"${position ? ` data-toaster-position="${position}"` : ""}></ui-toaster>`,
      ) as Region;
      region.addToast({ title: "Swipe me", duration });
      const toast = region.querySelector('[data-toaster-slot~="toast"]') as HTMLElement;
      return { region, toast };
    };
    const has = (toast: Element, token: string) =>
      toast.matches(`[data-toaster-state~="${token}"]`);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it("a slow swipe past the distance toward the entry edge dismisses", async () => {
      const { region, toast } = withToast();
      await frame();
      await drag(toast, { dy: 90, hold: 150 });
      expect(has(toast, "removed")).toBe(true);
      expect(has(toast, "swiped")).toBe(true);
      expect(has(toast, "swiping")).toBe(false);
      region.dismissAll();
    });

    it("a short slow swipe returns to rest", async () => {
      const { region, toast } = withToast();
      await frame();
      await drag(toast, { dy: 30, hold: 150 });
      expect(has(toast, "removed")).toBe(false);
      expect(has(toast, "swiping")).toBe(false);
      expect(toast.style.translate).toBe("");
      region.dismissAll();
    });

    it("a quick flick dismisses over a short distance", async () => {
      const { region, toast } = withToast();
      await frame();
      await drag(toast, { dy: 32, steps: 4, interval: 6 });
      expect(has(toast, "removed")).toBe(true);
      region.dismissAll();
    });

    it("follows the pointer 1:1 toward the edge and resists the other way", async () => {
      const { region, toast } = withToast();
      await frame();
      // the drag starts at the first move (10px), so 40px of travel remain
      const down = await drag(toast, { dy: 50, steps: 5, hold: 150, keepDown: true });
      expect(has(toast, "swiping")).toBe(true);
      expect(style(toast, "translate")).toBe("0px 40px");
      pointerUp(down);

      const up = await drag(toast, { dy: -200, steps: 5, hold: 150, keepDown: true });
      const lifted = Number.parseFloat(style(toast, "translate").split(" ")[1]);
      expect(lifted).toBeLessThan(0);
      expect(lifted).toBeGreaterThan(-24);
      pointerUp(up);
      expect(has(toast, "removed")).toBe(false);
      region.dismissAll();
    });

    it("dismisses sideways toward the nearest inline edge only, and upward from the top", async () => {
      const away = withToast("bottom-end");
      await frame();
      await drag(away.toast, { dx: -120, hold: 150 });
      expect(has(away.toast, "removed")).toBe(false);
      await drag(away.toast, { dx: 120, hold: 150 });
      expect(has(away.toast, "removed")).toBe(true);
      away.region.dismissAll();

      const start = withToast("bottom-start");
      await frame();
      await drag(start.toast, { dx: -120, hold: 150 });
      expect(has(start.toast, "removed")).toBe(true);
      start.region.dismissAll();

      const top = withToast("top-center");
      await frame();
      await drag(top.toast, { dy: -90, hold: 150 });
      expect(has(top.toast, "removed")).toBe(true);
      top.region.dismissAll();
    });

    it("holds the auto-dismiss timer while a toast is being swiped", async () => {
      const { region, toast } = withToast(undefined, 60);
      const held = await drag(toast, { dy: 20, steps: 2, keepDown: true });
      await sleep(200);
      expect(has(toast, "removed")).toBe(false);
      pointerUp(held);
      expect(has(toast, "removed")).toBe(false);
      await sleep(200);
      expect(has(toast, "removed")).toBe(true);
      region.dismissAll();
    });

    it("a press without movement is still a click on the close button", async () => {
      const { region, toast } = withToast();
      await frame();
      const close = toast.querySelector('[data-toaster-slot~="close"]') as HTMLElement;
      await drag(close, { steps: 0 });
      close.click();
      expect(has(toast, "removed")).toBe(true);
      region.dismissAll();
    });
  });
});
