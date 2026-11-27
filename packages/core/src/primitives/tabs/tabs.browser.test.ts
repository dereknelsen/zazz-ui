"use strict";

/**
 * @fileoverview The tabs: `data-tabs-slot` parts in tag and attribute
 * form, the checked tab's label taking the active color, and
 * `data-tabs-orientation="vertical"` stacking the list, the
 * `data-tabs-variant="underline"` preset, nested tabs, and the arrow keys
 * following the writing direction.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";
import "./tabs.ts";

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

  it("insets the default indicator by --ui-tabs-indicator-inset; the underline sits flush", () => {
    const root = mount(`<div>
      <ui-tabs data-default>${TABS("i")}</ui-tabs>
      <ui-tabs data-underline data-tabs-variant="underline">${TABS("j")}</ui-tabs>
      <i data-half style="display: block; width: calc(var(--ui-tabs-track-p) / 2)"></i>
    </div>`);
    const half =
      Math.round(root.querySelector("[data-half]")!.getBoundingClientRect().width * 10) / 10;
    expect(half).toBeGreaterThan(0);
    const gaps = (selector: string) => {
      const tabs = root.querySelector(selector)!;
      const indicator = tabs.querySelector("[data-tabs-slot='indicator']")!.getBoundingClientRect();
      const label = tabs.querySelector("[data-on]")!.getBoundingClientRect();
      return [
        indicator.top - label.top,
        indicator.left - label.left,
        label.right - indicator.right,
        label.bottom - indicator.bottom,
      ].map((gap) => Math.round(gap * 10) / 10);
    };
    // the default: half the track padding on every side
    expect(gaps("[data-default]")).toEqual([half, half, half, half]);
    // the underline: on the label's own edges, so the line meets the label's bottom
    expect(gaps("[data-underline]")).toEqual([0, 0, 0, 0]);
    // the insets are logical, and the pill covers the same box right to left
    root.dir = "rtl";
    expect(gaps("[data-default]")).toEqual([half, half, half, half]);
    expect(gaps("[data-underline]")).toEqual([0, 0, 0, 0]);
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

  it("the horizontal arrows follow the writing direction: ArrowLeft is next in RTL", () => {
    // three tabs, so "previous" (which wraps to the last) is not also "next"
    const press = (dir: string, key: string): number => {
      const root = mount(`<div dir="${dir}"><ui-tabs><div data-tabs-slot="list" role="tablist">
        <input type="radio" name="r" checked /><input type="radio" name="r" /><input type="radio" name="r" />
      </div></ui-tabs></div>`);
      const tabs = Array.from(root.querySelectorAll("input"));
      tabs[0]!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
      return tabs.findIndex((tab) => tab.checked);
    };
    expect(press("ltr", "ArrowRight"), "ltr next").toBe(1);
    expect(press("ltr", "ArrowLeft"), "ltr previous wraps").toBe(2);
    expect(press("rtl", "ArrowLeft"), "rtl next").toBe(1);
    expect(press("rtl", "ArrowRight"), "rtl previous wraps").toBe(2);
  });
});
