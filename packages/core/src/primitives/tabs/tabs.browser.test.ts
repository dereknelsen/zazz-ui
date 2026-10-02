"use strict";

/**
 * @fileoverview The tabs: `data-tabs-slot` parts in tag and attribute
 * form, the checked tab's label taking the active color, and
 * `data-tabs-orientation="vertical"` stacking the list.
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
});
