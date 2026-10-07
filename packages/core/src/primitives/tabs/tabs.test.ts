// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for `<ui-tabs>` keyboard orientation
 * (`primitives/tabs/tabs.ts`): only `data-tabs-orientation` turns the arrows vertical.
 */

import { describe, expect, it } from "vite-plus/test";
import "./tabs.ts";

/** Presses `key` on the first tab and returns the index of the checked tab. */
function press(attributes: string, key: string): number {
  // Parse detached: happy-dom connects a custom element before its children exist.
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<ui-tabs ${attributes}><div data-tabs-slot="list" role="tablist">
    <input type="radio" role="tab" name="t" checked />
    <input type="radio" role="tab" name="t" />
  </div></ui-tabs>`;
  document.body.replaceChildren(wrapper);
  const tabs = Array.from(wrapper.querySelectorAll("input"));
  tabs[0]!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  const checked = tabs.findIndex((tab) => tab.checked);
  document.body.replaceChildren();
  return checked;
}

describe("<ui-tabs> orientation", () => {
  it("moves with ArrowDown when data-tabs-orientation is vertical", () => {
    expect(press('data-tabs-orientation="vertical"', "ArrowDown")).toBe(1);
  });

  it("ignores the unprefixed data-orientation", () => {
    expect(press('data-orientation="vertical"', "ArrowDown")).toBe(0);
    expect(press('data-orientation="vertical"', "ArrowRight")).toBe(1);
  });
});
