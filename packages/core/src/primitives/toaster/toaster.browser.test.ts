"use strict";

/**
 * @fileoverview The toaster: `data-toaster-slot` parts in tag and
 * attribute form, the variant accent on a toast, the position preset, and the
 * `--toast` invoker's `data-toaster-*` content attributes.
 */

import { describe, expect, it } from "vite-plus/test";
import { frame, mount, style, useCss, useKit } from "../../../test/browser.ts";
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
      <div data-success-color style="--text: var(--color-success)"></div>
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
});
