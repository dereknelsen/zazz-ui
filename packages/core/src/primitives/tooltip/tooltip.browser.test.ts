"use strict";

/**
 * @fileoverview The tooltip: `data-tooltip-slot` parts are styled in
 * tag and attribute form, the content keeps the popover placement presets,
 * and a `--bg` utility on the content beats the hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../../test/browser.ts";

const TIP = (
  id: string,
  attrs = "",
) => `<button type="button" data-ui="button" interestfor="${id}">t</button>
  <div data-tooltip-slot="content" id="${id}" popover="hint" ${attrs}>Tip<span data-tooltip-slot="arrow" aria-hidden="true"></span></div>`;

describe("tooltip", () => {
  useKit();

  it("styles the content and arrow in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-tooltip data-tag>${TIP("a")}</ui-tooltip>
      <span data-ui="tooltip" data-attr>${TIP("b")}</span>
      <div data-plain style="--bg: var(--ui-tooltip-bg)"></div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const content = root.querySelector(`${selector} [data-tooltip-slot='content']`)!;
      const arrow = root.querySelector(`${selector} [data-tooltip-slot='arrow']`)!;
      expect(style(content, "background-color"), selector).toBe(
        style(root.querySelector("[data-plain]")!, "background-color"),
      );
      expect(style(arrow, "position"), selector).toBe("absolute");
    }
  });

  // The anchor sits at the viewport edge, so a side without room would resolve
  // to its position-try fallback; bottom always has room.
  it("keeps the popover placement presets on the content and takes a --bg utility", () => {
    const probe = mount(`<div>
      <div data-area style="position: fixed; position-area: block-end span-all"></div>
      <div data-plain style="--bg: rgb(1, 2, 3)"></div>
    </div>`);
    const area = style(probe.querySelector("[data-area]")!, "position-area");
    const plainBackground = style(probe.querySelector("[data-plain]")!, "background-color");
    const root = mount(
      `<ui-tooltip>${TIP("c", 'data-popover-side="bottom" style="--bg: rgb(1, 2, 3)"')}</ui-tooltip>`,
    );
    const content = root.querySelector("[data-tooltip-slot='content']")!;
    expect(style(content, "position-area")).toBe(area);
    expect(style(content, "background-color")).toBe(plainBackground);
  });
});
