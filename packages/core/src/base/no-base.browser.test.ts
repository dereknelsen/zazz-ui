"use strict";

/**
 * @fileoverview The no-base allowlist for padding, `--bg`, and `--z`: a tier alone
 * works on a plain element (the reset zeroes padding and paints nothing),
 * reaches a primitive only through the primitive's own chain, and keeps the
 * base's padding or paint on the elements the base styles (a list's indent,
 * inline code).
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { KIT_SELECTORS } from "./kit-styling.ts";
import { at, atWidth, below, mount, scale, style, useKit } from "../../test/browser.ts";

/** True for a fully transparent color in either serialization (`rgba(0, 0, 0, 0)`, `oklch(… / 0)`). */
const transparent = (color: string) => /\/ 0\)$|^rgba\(0, 0, 0, 0\)$|^transparent$/.test(color);

describe("no-base padding and background", () => {
  useKit();

  it("--px--md alone pads a plain element from md and leaves it unpadded below", async () => {
    const probe = mount(`<div><div data-probe style="--px--md: 4">x</div></div>`).querySelector(
      "[data-probe]",
    )!;
    await atWidth(767);
    expect(style(probe, "padding-inline-start")).toBe("0px");
    await atWidth(768);
    expect(parseFloat(style(probe, "padding-inline-start"))).toBeCloseTo(scale(4), 1);
  });

  it("--bg--hover alone leaves a plain element transparent at rest", () => {
    const probe = mount(`<div data-probe style="--bg--hover: red">x</div>`);
    expect(transparent(style(probe, "background-color"))).toBe(true);
  });

  it("--z--hover alone lifts a plain element only while hovered", async () => {
    const probe = mount(
      `<div data-probe style="position: relative; inline-size: 100px; block-size: 40px; --z--hover: 5">x</div>`,
    );
    expect(style(probe, "z-index")).toBe("auto");
    await userEvent.hover(probe);
    expect(style(probe, "z-index")).toBe("5");
    await userEvent.unhover(probe);
    expect(style(probe, "z-index")).toBe("auto");
  });

  it("--z--hover overrides a base --z, and --group-z--hover follows the group", async () => {
    const root = mount(`<div data-ui="group" style="inline-size: 100px; block-size: 40px">
      <div data-own style="position: relative; --z: 1; --z--hover: 3">a</div>
      <div data-member style="position: relative; --z: 1; --group-z--hover: 4">b</div>
      <div data-bare style="position: relative; --group-z--hover: 2">c</div>
    </div>`);
    const own = root.querySelector("[data-own]")!;
    const member = root.querySelector("[data-member]")!;
    const bare = root.querySelector("[data-bare]")!;
    expect(style(own, "z-index")).toBe("1");
    expect(style(member, "z-index")).toBe("1");
    expect(style(bare, "z-index")).toBe("auto");
    await userEvent.hover(root);
    expect(style(member, "z-index")).toBe("4");
    expect(style(bare, "z-index")).toBe("2");
    await userEvent.hover(own);
    expect(style(own, "z-index")).toBe("3");
    await userEvent.unhover(root);
    expect(style(own, "z-index")).toBe("1");
    expect(style(member, "z-index")).toBe("1");
    expect(style(bare, "z-index")).toBe("auto");
  });

  it("--z--hover alone keeps a primitive's own z-index", async () => {
    const root = mount(`<div data-ui="tabs"><div data-tabs-slot="list">
      <button type="button" data-tabs-slot="label" style="--z--hover: 5">a</button>
    </div></div>`);
    const label = root.querySelector("[data-tabs-slot~='label']")!;
    expect(style(label, "z-index")).toBe("1");
    await userEvent.hover(label);
    expect(style(label, "z-index")).toBe("1");
  });

  it("on a primitive reaches its own chain (SPEC §9), not the no-base rule", async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <button type="button" data-ui="button" data-plain>b</button>
      <button type="button" data-ui="button" data-tier style="--px--md: 0; --bg--hover: red">b</button>
    </div>`);
    const plain = root.querySelector("[data-plain]")!;
    const tier = root.querySelector("[data-tier]")!;
    // a button reads --px through its hook chain, so the md tier applies without a base
    expect(style(plain, "padding-inline-start")).not.toBe("0px");
    expect(style(tier, "padding-inline-start")).toBe("0px");
    // and the hover tier leaves its rest paint alone
    expect(style(tier, "background-color")).toBe(style(plain, "background-color"));
  });

  it("keeps the base's padding and paint on the elements it styles", async () => {
    await atWidth(767);
    const root = mount(`<div data-ui="prose">
      <ul data-plain><li>a</li></ul>
      <ul data-tier style="--pl--md: 0"><li>a</li></ul>
      <code data-code style="--bg--hover: red">c</code>
    </div>`);
    const plain = root.querySelector("[data-plain]")!;
    const tier = root.querySelector("[data-tier]")!;
    expect(style(tier, "padding-inline-start")).toBe(style(plain, "padding-inline-start"));
    expect(style(plain, "padding-inline-start")).not.toBe("0px");
    expect(transparent(style(root.querySelector("[data-code]")!, "background-color"))).toBe(false);
  });

  it.each([
    [
      "a popover",
      `<div popover data-ref></div><div popover data-tier style="--p--md: 2; --bg--md: red"></div>`,
    ],
    [
      "a menu popover",
      `<div data-ui="menu"><div popover data-menu-slot="popover" data-ref></div><div popover data-menu-slot="popover" data-tier style="--p--md: 2; --bg--md: red"></div></div>`,
    ],
    ["a kbd", `<kbd data-ref>K</kbd><kbd data-tier style="--px--md: 2; --bg--md: red">K</kbd>`],
    [
      "a checkbox",
      `<input type="checkbox" data-ref><input type="checkbox" data-tier style="--bg--md: red">`,
    ],
  ])("on %s a tier alone keeps the element's own padding and paint at rest", async (_, html) => {
    const root = mount(`<div>${html}</div>`);
    const ref = root.querySelector("[data-ref]")!;
    const tier = root.querySelector("[data-tier]")!;
    await atWidth(below("md"));
    for (const property of ["padding-inline-start", "background-color"]) {
      expect(style(tier, property), property).toBe(style(ref, property));
    }
  });

  it("on a part that sets the property without reading it, a tier needs a base", async () => {
    // a popover paints var(--color-popover) without reading --bg
    const root = mount(
      `<div><div popover data-ref></div><div popover data-alone style="--bg--md: red"></div><div popover data-based style="--bg: red; --bg--md: blue"></div><i data-blue style="--bg: blue"></i></div>`,
    );
    await atWidth(at("md"));
    const color = (selector: string) => style(root.querySelector(selector)!, "background-color");
    expect(color("[data-alone]")).toBe(color("[data-ref]"));
    expect(color("[data-based]")).toBe(color("[data-blue]"));
  });

  it("on kbd, which reads --px, a tier alone applies", async () => {
    const root = mount(`<div><kbd data-tier style="--px--md: 2">K</kbd></div>`);
    await atWidth(at("md"));
    const tier = root.querySelector("[data-tier]")!;
    expect(parseFloat(style(tier, "padding-inline-start"))).toBeCloseTo(scale(2), 1);
  });

  it("on tooltip content, which reads --text, a tier alone applies", async () => {
    const root = mount(
      `<div data-ui="tooltip"><button>i</button><div data-tooltip-slot="content" style="--text--md: red"></div><i data-red style="--text: red"></i></div>`,
    );
    await atWidth(at("md"));
    expect(style(root.querySelector("[data-tooltip-slot]")!, "color")).toBe(
      style(root.querySelector("[data-red]")!, "color"),
    );
  });

  it("every selector the generator derives from the kit's stylesheets is valid CSS", () => {
    for (const selector of KIT_SELECTORS) {
      expect(CSS.supports(`selector(${selector})`), selector).toBe(true);
    }
  });

  it("a longhand tier beside its shorthand's base applies, and the shorthand holds below", async () => {
    const root = mount(`<div>
      <div data-p style="--p: 4; --px--md: 1; --pt--md: 0"></div>
      <div data-gap style="--display: flex; --gap: 4; --gap-x--md: 8"></div>
      <div style="--display: flex"><i data-flex style="--flex: 1; --basis--md: 50%"></i></div>
    </div>`);
    const p = root.querySelector("[data-p]")!;
    const gap = root.querySelector("[data-gap]")!;
    const flex = root.querySelector("[data-flex]")!;
    await atWidth(below("md"));
    expect(parseFloat(style(p, "padding-inline-start"))).toBeCloseTo(scale(4), 1);
    expect(parseFloat(style(p, "padding-block-start"))).toBeCloseTo(scale(4), 1);
    expect(parseFloat(style(gap, "column-gap"))).toBeCloseTo(scale(4), 1);
    await atWidth(at("md"));
    expect(parseFloat(style(p, "padding-inline-start"))).toBeCloseTo(scale(1), 1);
    expect(parseFloat(style(p, "padding-block-start"))).toBe(0);
    expect(parseFloat(style(p, "padding-block-end"))).toBeCloseTo(scale(4), 1);
    expect(parseFloat(style(gap, "column-gap"))).toBeCloseTo(scale(8), 1);
    expect(parseFloat(style(gap, "row-gap"))).toBeCloseTo(scale(4), 1);
    expect(style(flex, "flex-basis")).toBe("50%");
  });

  it("a raw longhand beside --flex leaves the shorthand's part alone below the tier", async () => {
    const root = mount(`<div style="display: flex">
      <i data-basis style="--flex: 1; --basis--md: 50%"></i>
      <i data-shrink style="--flex: none; --shrink--md: 1"></i>
      <i data-based style="--flex: 1; --shrink: 0"></i>
    </div>`);
    const basis = root.querySelector("[data-basis]")!;
    const shrink = root.querySelector("[data-shrink]")!;
    await atWidth(below("md"));
    expect(style(basis, "flex-basis")).toBe("0%");
    expect(style(shrink, "flex-shrink")).toBe("0");
    expect(style(root.querySelector("[data-based]")!, "flex-shrink")).toBe("0");
    await atWidth(at("md"));
    expect(style(shrink, "flex-shrink")).toBe("1");
  });

  it("keeps what the reset or the browser styles on purpose under a tier alone", async () => {
    const root = mount(`<div>
      <div style="display: flex"><hr data-hr style="--shrink--md: 1"></div>
      <div style="text-align: center"><button data-button style="--text-align--md: end">b</button></div>
      <dialog data-dialog style="--position--md: absolute">d</dialog>
    </div>`);
    const dialog = root.querySelector<HTMLDialogElement>("[data-dialog]")!;
    dialog.showModal();
    await atWidth(below("md"));
    expect(style(root.querySelector("[data-hr]")!, "flex-shrink")).toBe("0");
    expect(style(root.querySelector("[data-button]")!, "text-align")).toBe("center");
    expect(style(dialog, "position")).toBe("fixed");
    dialog.close();
  });
});
