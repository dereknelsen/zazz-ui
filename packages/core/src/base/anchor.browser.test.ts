"use strict";

/**
 * @fileoverview `--anchor-name`, `--position-anchor`, and `--position-area`:
 * the base emits the property, state and breakpoint tiers switch it, and each
 * works tier-only, so a hovered block can claim the anchor an editor toolbar
 * is tethered to and the toolbar can sit above it.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

const BOX = "inline-size: 100px; block-size: 40px;";
const supported = CSS.supports("anchor-name: --a");

/** A tier alone on each one; the part must keep the primitive's anchor. */
const NAMED = `style="--anchor-name--hover: --x"`;
const TETHERED = `style="--position-anchor--open: --x"`;

/** Each primitive part that sets its own anchor: [label, markup, part selector, property, the primitive's value]. */
const ANCHORED_PARTS: readonly (readonly [string, string, string, string, string])[] = [
  [
    "menu trigger",
    `<div data-ui="menu"><button popovertarget="m" ${NAMED}>Open</button><div id="m" popover data-menu-slot="popover" ${TETHERED}></div></div>`,
    "button",
    "anchor-name",
    "--ui-menu-trigger",
  ],
  [
    "menu popover",
    `<div data-ui="menu"><button popovertarget="m" ${NAMED}>Open</button><div id="m" popover data-menu-slot="popover" ${TETHERED}></div></div>`,
    "[popover]",
    "position-anchor",
    "--ui-menu-trigger",
  ],
  [
    "tooltip trigger",
    `<div data-ui="tooltip"><button data-tooltip-slot="trigger" ${NAMED}>i</button><div data-tooltip-slot="content" ${TETHERED}></div></div>`,
    "button",
    "anchor-name",
    "--ui-tooltip-trigger",
  ],
  [
    "tooltip content",
    `<div data-ui="tooltip"><button data-tooltip-slot="trigger" ${NAMED}>i</button><div data-tooltip-slot="content" ${TETHERED}></div></div>`,
    "[data-tooltip-slot~='content']",
    "position-anchor",
    "--ui-tooltip-trigger",
  ],
  [
    "command trigger",
    `<div data-ui="command"><button popovertarget="c" ${NAMED}>Go</button><div id="c" popover data-command-slot="panel" ${TETHERED}></div></div>`,
    "button",
    "anchor-name",
    "--ui-command-trigger",
  ],
  [
    "command panel",
    `<div data-ui="command"><button popovertarget="c" ${NAMED}>Go</button><div id="c" popover data-command-slot="panel" ${TETHERED}></div></div>`,
    "[popover]",
    "position-anchor",
    "--ui-command-trigger",
  ],
  [
    "autocomplete input",
    `<div data-ui="autocomplete"><input role="combobox" ${NAMED}><div data-autocomplete-slot="panel" ${TETHERED}></div></div>`,
    "input",
    "anchor-name",
    "--ui-autocomplete-trigger",
  ],
  [
    "autocomplete panel",
    `<div data-ui="autocomplete"><input role="combobox" ${NAMED}><div data-autocomplete-slot="panel" ${TETHERED}></div></div>`,
    "[data-autocomplete-slot~='panel']",
    "position-anchor",
    "--ui-autocomplete-trigger",
  ],
  [
    "combobox control",
    `<div data-ui="combobox"><div data-combobox-slot="control" ${NAMED}></div><div data-combobox-slot="panel" ${TETHERED}></div></div>`,
    "[data-combobox-slot~='control']",
    "anchor-name",
    "--ui-combobox-trigger",
  ],
  [
    "combobox panel",
    `<div data-ui="combobox"><div data-combobox-slot="control" ${NAMED}></div><div data-combobox-slot="panel" ${TETHERED}></div></div>`,
    "[data-combobox-slot~='panel']",
    "position-anchor",
    "--ui-combobox-trigger",
  ],
  [
    "checked tab label",
    `<div data-ui="tabs"><div data-tabs-slot="list"><input type="radio" name="t" id="t1" checked><label for="t1" data-tabs-slot="label" ${NAMED}>A</label><span data-tabs-slot="indicator" ${TETHERED}></span></div></div>`,
    "label",
    "anchor-name",
    "--active-tab",
  ],
  [
    "tab indicator",
    `<div data-ui="tabs"><div data-tabs-slot="list"><input type="radio" name="t" id="t1" checked><label for="t1" data-tabs-slot="label" ${NAMED}>A</label><span data-tabs-slot="indicator" ${TETHERED}></span></div></div>`,
    "[data-tabs-slot~='indicator']",
    "position-anchor",
    "--active-tab",
  ],
  [
    "navigation menu list",
    `<nav data-ui="navigation-menu"><ul data-navigation-menu-slot="list" ${NAMED}><li><button data-navigation-menu-slot="trigger" ${NAMED}>A</button><div data-navigation-menu-slot="popover" ${TETHERED}></div></li></ul></nav>`,
    "ul",
    "anchor-name",
    "--ui-navigation-menu-menu-list",
  ],
  [
    "navigation menu trigger",
    `<nav data-ui="navigation-menu"><ul data-navigation-menu-slot="list" ${NAMED}><li><button data-navigation-menu-slot="trigger" ${NAMED}>A</button><div data-navigation-menu-slot="popover" ${TETHERED}></div></li></ul></nav>`,
    "button",
    "anchor-name",
    "--ui-navigation-menu-menu-trigger",
  ],
  [
    "navigation menu popover",
    `<nav data-ui="navigation-menu"><ul data-navigation-menu-slot="list" ${NAMED}><li><button data-navigation-menu-slot="trigger" ${NAMED}>A</button><div data-navigation-menu-slot="popover" ${TETHERED}></div></li></ul></nav>`,
    "[data-navigation-menu-slot~='popover']",
    "position-anchor",
    "--ui-navigation-menu-menu-trigger",
  ],
];

describe.skipIf(!supported)("--anchor-name and --position-anchor", () => {
  useKit();

  it("the base sets anchor-name and position-anchor", () => {
    const root = mount(
      `<div style="position: relative">
        <div data-anchor style="${BOX} --anchor-name: --block"></div>
        <div data-tethered style="position: absolute; --position-anchor: --block"></div>
      </div>`,
    );
    expect(style(root.querySelector("[data-anchor]")!, "anchor-name")).toBe("--block");
    expect(style(root.querySelector("[data-tethered]")!, "position-anchor")).toBe("--block");
  });

  it("--anchor-name--hover alone names the hovered block, and the tethered element follows it", async () => {
    const root = mount(
      `<div style="position: relative">
        <div data-a style="${BOX} --anchor-name--hover: --hovered"></div>
        <div data-b style="${BOX} --anchor-name--hover: --hovered"></div>
        <div data-chrome style="position: absolute; inline-size: 20px; block-size: 10px;
          position-anchor: --hovered; top: anchor(bottom); left: anchor(left)"></div>
      </div>`,
    );
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    const chrome = root.querySelector("[data-chrome]")!;
    expect(style(a, "anchor-name")).toBe("none");
    await userEvent.hover(b);
    expect(style(b, "anchor-name")).toBe("--hovered");
    expect(chrome.getBoundingClientRect().top).toBeCloseTo(b.getBoundingClientRect().bottom, 1);
    await userEvent.hover(a);
    expect(style(b, "anchor-name")).toBe("none");
    expect(chrome.getBoundingClientRect().top).toBeCloseTo(a.getBoundingClientRect().bottom, 1);
    await userEvent.unhover(a);
  });

  it("--group-anchor-name--hover names a child while its group is hovered", async () => {
    const root = mount(
      `<div data-ui="group" style="${BOX}">
        <div data-child style="${BOX} --group-anchor-name--hover: --row"></div>
      </div>`,
    );
    const child = root.querySelector("[data-child]")!;
    expect(style(child, "anchor-name")).toBe("none");
    await userEvent.hover(root);
    expect(style(child, "anchor-name")).toBe("--row");
    await userEvent.unhover(root);
  });

  it.each(ANCHORED_PARTS)(
    "a tier alone on the %s keeps the primitive's anchor at rest",
    (_, html, part, property, value) => {
      const root = mount(html);
      expect(style(root.querySelector(part)!, property)).toBe(value);
    },
  );

  it("--position-anchor--md switches the anchor at md, and the base holds below", async () => {
    const el = mount(
      `<div style="position: absolute; --position-anchor: --narrow; --position-anchor--md: --wide"></div>`,
    );
    await atWidth(below("md"));
    expect(style(el, "position-anchor")).toBe("--narrow");
    await atWidth(at("md"));
    expect(style(el, "position-anchor")).toBe("--wide");
  });

  it("--position-anchor--open alone tethers an element only while it is open", () => {
    const el = mount(`<details style="--position-anchor--open: --trigger"></details>`);
    // the initial value, which engines spell `auto` (older drafts) or `normal`
    expect(style(el, "position-anchor")).toBe(style(document.body, "position-anchor"));
    el.setAttribute("open", "");
    expect(style(el, "position-anchor")).toBe("--trigger");
  });

  it("--position-area places the tethered element against its anchor", () => {
    const root = mount(
      `<div style="position: relative; padding-block: 60px">
        <div data-block style="${BOX} --anchor-name: --block"></div>
        <div data-toolbar style="inline-size: 20px; block-size: 10px;
          --position: absolute; --position-anchor: --block; --position-area: block-start span-inline-end"></div>
      </div>`,
    );
    const block = root.querySelector("[data-block]")!.getBoundingClientRect();
    const toolbar = root.querySelector("[data-toolbar]")!.getBoundingClientRect();
    expect(toolbar.bottom).toBeCloseTo(block.top, 1);
    expect(toolbar.left).toBeCloseTo(block.left, 1);
  });

  it("--position-area--md alone places the element from md, and none holds below", async () => {
    const el = mount(`<div style="--position-area--md: block-end"></div>`);
    await atWidth(below("md"));
    expect(style(el, "position-area")).toBe("none");
    await atWidth(at("md"));
    expect(style(el, "position-area")).toBe("block-end");
  });

  it("--position-area--hover takes states", async () => {
    const el = mount(
      `<div style="${BOX} --position-area: block-start; --position-area--hover: block-end"></div>`,
    );
    expect(style(el, "position-area")).toBe("block-start");
    await userEvent.hover(el);
    expect(style(el, "position-area")).toBe("block-end");
    await userEvent.unhover(el);
  });

  it("a tier alone on a popover keeps the popover's own area at rest", async () => {
    const root = mount(
      `<div><div popover data-plain></div><div popover data-tiered style="--position-area--md: block-start"></div></div>`,
    );
    await atWidth(below("md"));
    const own = style(root.querySelector("[data-plain]")!, "position-area");
    expect(own).not.toBe("none");
    expect(style(root.querySelector("[data-tiered]")!, "position-area")).toBe(own);
  });
});
