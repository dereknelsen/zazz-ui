"use strict";

/**
 * @fileoverview The tooltip: `data-tooltip-slot` parts are styled in
 * tag and attribute form, the content keeps the popover placement presets,
 * and a `--bg` utility on the content beats the hook.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const TIP = (
  id: string,
  attrs = "",
) => `<button type="button" data-ui="button" interestfor="${id}">t</button>
  <div data-tooltip-slot="content" id="${id}" popover="hint" ${attrs}>Tip<span data-tooltip-slot="arrow" aria-hidden="true"></span></div>`;

describe("tooltip", () => {
  useKit();
  useCss(`[data-tooltip-slot="content"] { transition: none; }`);

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

  /** Within the content's 1px border: the arrow insets from the padding box. */
  const expectNear = (actual: number, expected: number) =>
    expect(Math.abs(actual - expected)).toBeLessThan(1.5);

  /** The open content's box and its arrow's center (rotation keeps the center). */
  const arrowGeometry = (content: HTMLElement) => {
    content.showPopover();
    const box = content.getBoundingClientRect();
    const a = content.querySelector("[data-tooltip-slot='arrow']")!.getBoundingClientRect();
    content.hidePopover();
    return { box, x: a.left + a.width / 2, y: a.top + a.height / 2 };
  };

  it("puts the arrow on the anchor-facing edge, mirrored in RTL", () => {
    // Centered in the viewport so every side has room and no fallback applies.
    const root = mount(`<div style="position: fixed; inset: 40vh 40vw">
      <ui-tooltip data-ltr>${TIP("d", 'data-popover-side="left"')}</ui-tooltip>
      <ui-tooltip dir="rtl" data-rtl>${TIP("e", 'data-popover-side="left"')}</ui-tooltip>
      <ui-tooltip data-bottom>${TIP("f", 'data-popover-side="bottom"')}</ui-tooltip>
    </div>`);
    const geometry = (selector: string) =>
      arrowGeometry(root.querySelector<HTMLElement>(`${selector} [data-tooltip-slot='content']`)!);
    // side=left is the inline-start side: the arrow straddles the inline-end edge.
    const ltr = geometry("[data-ltr]");
    expectNear(ltr.x, ltr.box.right);
    expectNear(ltr.y, ltr.box.top + ltr.box.height / 2);
    const rtl = geometry("[data-rtl]");
    expectNear(rtl.x, rtl.box.left);
    const bottom = geometry("[data-bottom]");
    expectNear(bottom.y, bottom.box.top);
    expectNear(bottom.x, bottom.box.left + bottom.box.width / 2);
  });

  // Waits on Lightning CSS parsing @container anchored(): see the arrow rules in tooltip.css.
  it.todo("moves the arrow when a position-try fallback flips the tooltip");
});
