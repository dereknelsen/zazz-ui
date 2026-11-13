"use strict";

/**
 * @fileoverview The tabs: `data-tabs-slot` parts in tag and attribute
 * form, the checked tab's label taking the active color, and
 * `data-tabs-orientation="vertical"` stacking the list, the
 * `data-tabs-variant="underline"` preset, and nested tabs.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const TABS = (name: string) => `<div data-tabs-slot="list" role="tablist">
    <div data-tabs-slot="indicator" aria-hidden="true"></div>
    <input type="radio" name="${name}" id="${name}-1" checked /><label for="${name}-1" data-tabs-slot="label" data-on><span data-tabs-slot="label-text">One</span></label>
    <input type="radio" name="${name}" id="${name}-2" /><label for="${name}-2" data-tabs-slot="label" data-off><span data-tabs-slot="label-text">Two</span></label>
  </div>
  <div data-tabs-slot="panel">p1</div><div data-tabs-slot="panel">p2</div>`;

describe("tabs", () => {
  useKit();
  useCss(`[data-tabs-slot], [data-tabs-slot]::before { transition: none; }`);

  it("colors the checked tab's label and hides the inactive panel, in both forms", () => {
    const root = mount(`<div>
      <ui-tabs data-tag>${TABS("a")}</ui-tabs>
      <div data-ui="tabs" data-attr>${TABS("b")}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const tabs = root.querySelector(selector)!;
      expect(style(tabs.querySelector("[data-on]")!, "color"), selector).not.toBe(
        style(tabs.querySelector("[data-off]")!, "color"),
      );
      const panels = tabs.querySelectorAll("[data-tabs-slot='panel']");
      expect(style(panels[0]!, "display"), selector).not.toBe("none");
      expect(style(panels[1]!, "display"), selector).toBe("none");
    }
  });

  it("the vertical preset stacks the list", () => {
    const tabs = mount(`<ui-tabs data-tabs-orientation="vertical">${TABS("c")}</ui-tabs>`);
    expect(style(tabs.querySelector("[data-tabs-slot='list']")!, "flex-direction")).toBe("column");
  });

  it("the underline variant drops the track and draws the indicator as a bottom border", () => {
    const root = mount(`<div>
      <ui-tabs data-tabs-variant="underline">${TABS("d")}</ui-tabs>
      <p data-md style="font-size: var(--font-size-md)">md</p>
    </div>`);
    const list = root.querySelector("[data-tabs-slot='list']")!;
    const indicator = root.querySelector("[data-tabs-slot='indicator']")!;
    expect(style(list, "background-color")).toBe("rgba(0, 0, 0, 0)");
    expect(style(list, "padding-top")).toBe("0px");
    expect(style(list, "border-top-width")).toBe("0px");
    expect(style(indicator, "background-color")).toBe("rgba(0, 0, 0, 0)");
    expect(style(indicator, "border-bottom-width")).toBe("2px");
    expect(style(indicator, "border-left-width")).toBe("0px");
    expect(style(indicator, "border-bottom-left-radius")).toBe("0px");
    expect(style(root.querySelector("[data-on]")!, "font-size")).toBe(
      style(root.querySelector("[data-md]")!, "font-size"),
    );
  });

  it("the underline variant moves the border to the start edge when vertical", () => {
    const tabs = mount(
      `<ui-tabs data-tabs-variant="underline" data-tabs-orientation="vertical">${TABS("e")}</ui-tabs>`,
    );
    const indicator = tabs.querySelector("[data-tabs-slot='indicator']")!;
    expect(style(indicator, "border-left-width")).toBe("2px");
    expect(style(indicator, "border-bottom-width")).toBe("0px");
  });

  it("nested tabs keep their own panels and their own variant", () => {
    const inner = TABS("g").replace(" checked", "").replace('id="g-2"', 'id="g-2" checked');
    const tabs = mount(`<ui-tabs data-tabs-variant="underline" data-outer>
      ${TABS("f").replace(
        '<div data-tabs-slot="panel">p1</div>',
        `<div data-tabs-slot="panel"><ui-tabs data-inner>${inner}</ui-tabs></div>`,
      )}
    </ui-tabs>`);
    const outerPanels = tabs.querySelectorAll(":scope > [data-tabs-slot='panel']");
    // the inner tabs have their second tab checked; the outer first panel stays shown
    expect(style(outerPanels[0]!, "display")).not.toBe("none");
    expect(style(outerPanels[1]!, "display")).toBe("none");
    const innerList = tabs.querySelector("[data-inner] [data-tabs-slot='list']")!;
    expect(style(innerList, "padding-top")).not.toBe("0px");
    expect(
      style(
        tabs.querySelector("[data-inner] [data-tabs-slot='indicator']")!,
        "border-bottom-width",
      ),
    ).not.toBe("2px");
  });
});
