"use strict";

/**
 * @fileoverview The tabs: `data-tabs-slot` parts in tag and attribute
 * form, the checked tab's label taking the active color, and
 * `data-tabs-orientation="vertical"` stacking the list, the
 * `data-tabs-variant="underline"` preset, nested tabs, and the arrow keys
 * following the writing direction and skipping an `aria-disabled` tab.
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

  it("the default indicator covers the checked label; --ui-tabs-indicator-inset insets it; the underline sits flush", () => {
    const root = mount(`<div>
      <ui-tabs data-default>${TABS("i")}</ui-tabs>
      <ui-tabs data-inset style="--ui-tabs-indicator-inset: 3px">${TABS("h")}</ui-tabs>
      <ui-tabs data-underline data-tabs-variant="underline" style="--ui-tabs-indicator-inset: 3px">${TABS("j")}</ui-tabs>
    </div>`);
    const inset = 3;
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
    // the default: the pill is the checked label's box, at the track padding
    expect(gaps("[data-default]")).toEqual([0, 0, 0, 0]);
    // an inset hook shrinks it on every side
    expect(gaps("[data-inset]")).toEqual([inset, inset, inset, inset]);
    // the underline: on the label's own edges, whatever the inset, so the line meets the label's bottom
    expect(gaps("[data-underline]")).toEqual([0, 0, 0, 0]);
    // the insets are logical, and the pill covers the same box right to left
    root.dir = "rtl";
    expect(gaps("[data-inset]")).toEqual([inset, inset, inset, inset]);
    expect(gaps("[data-underline]")).toEqual([0, 0, 0, 0]);
  });

  it("the label and indicator corners are concentric with the track's, whatever the borders", () => {
    const root = mount(`<div>
      <ui-tabs data-default>${TABS("k")}</ui-tabs>
    </div>`);
    // a nested radius is the outer radius less the distance between the two outer edges
    const check = (selector: string) => {
      const tabs = root.querySelector(selector)!;
      const list = tabs.querySelector("[data-tabs-slot='list']")!;
      const outer = parseFloat(style(list, "border-top-left-radius"));
      const top = list.getBoundingClientRect().top;
      for (const part of [
        tabs.querySelector("[data-tabs-slot='indicator']")!,
        tabs.querySelector("[data-on]")!,
      ]) {
        const depth = part.getBoundingClientRect().top - top;
        expect(parseFloat(style(part, "border-top-left-radius")), selector).toBeCloseTo(
          Math.max(0, outer - depth),
          0,
        );
      }
    };
    check("[data-default]");
    // the radius hooks resolve on :root, so a retune there carries through
    const retune = document.createElement("style");
    retune.textContent = `:root { --ui-tabs-track-border-width: 3px; --ui-tabs-indicator-border-width: 2px; --ui-tabs-track-p: 5px; }`;
    document.head.append(retune);
    try {
      check("[data-default]");
    } finally {
      retune.remove();
    }
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

  it("the arrow keys skip an aria-disabled tab", () => {
    const root = mount(`<ui-tabs><div data-tabs-slot="list" role="tablist">
      <input type="radio" name="d" checked /><input type="radio" name="d" aria-disabled="true" /><input type="radio" name="d" />
    </div></ui-tabs>`);
    const tabs = Array.from(root.querySelectorAll("input"));
    const press = (from: number, key: string): number => {
      tabs[from]!.checked = true;
      tabs[from]!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
      return tabs.findIndex((tab) => tab.checked);
    };
    expect(press(0, "ArrowRight"), "next skips it").toBe(2);
    expect(press(2, "ArrowLeft"), "previous skips it").toBe(0);
  });
});
