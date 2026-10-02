"use strict";

/**
 * @fileoverview Button group: both forms join their children,
 * `data-button-group-orientation="vertical"` stacks them, and a `--rounded`
 * utility beats the hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../../test/browser.ts";

const GROUP = `<button data-ui="button" data-first>a</button><button data-ui="button" data-last>b</button>`;

describe("button group", () => {
  useKit();

  it("squares the inner corners in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-button-group data-tag>${GROUP}</ui-button-group>
      <div data-ui="button-group" data-attr>${GROUP}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const group = root.querySelector(selector)!;
      const first = group.querySelector("[data-first]")!;
      expect(style(group, "display"), selector).toBe("flex");
      expect(style(first, "border-end-end-radius"), selector).toBe("0px");
      expect(style(first, "border-start-start-radius"), selector).not.toBe("0px");
    }
  });

  it("stacks a vertical group and squares the block-end corners", () => {
    const group = mount(
      `<ui-button-group data-button-group-orientation="vertical">${GROUP}</ui-button-group>`,
    );
    const first = group.querySelector("[data-first]")!;
    expect(style(group, "flex-direction")).toBe("column");
    expect(style(first, "border-end-start-radius")).toBe("0px");
    expect(style(first, "border-start-end-radius")).not.toBe("0px");
  });

  it("a --rounded utility beats the group hook", () => {
    const group = mount(`<ui-button-group style="--rounded: 7px">${GROUP}</ui-button-group>`);
    expect(style(group, "border-radius")).toBe("7px");
  });
});
