"use strict";

/**
 * @fileoverview One browser check per new emission shape across the flow,
 * grid, sizing, typography, and box families.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, scale, style, useKit } from "../../test/browser.ts";

const px = (value: string) => Number.parseFloat(value);
const tracks = (el: Element) => style(el, "grid-template-columns").trim().split(/\s+/).length;

describe("families", () => {
  useKit();

  it("--inset-x sets left and right, --inset-y top and bottom, with tiers", async () => {
    const root = mount(`<div style="position: relative; inline-size: 400px; block-size: 400px">
      <i data-x style="position: absolute; --inset-x: 4; --inset-y: 0; --inset-y--md: var(--space-sm)"></i>
      <i data-y style="position: absolute; --inset-y: 10%"></i>
    </div>`);
    const x = root.querySelector("[data-x]")!;
    const y = root.querySelector("[data-y]")!;
    await atWidth(at("md"));
    expect(px(style(x, "left"))).toBeCloseTo(scale(4), 1);
    expect(px(style(x, "right"))).toBeCloseTo(scale(4), 1);
    expect(px(style(x, "top"))).toBeCloseTo(scale(4), 1);
    expect(px(style(x, "bottom"))).toBeCloseTo(scale(4), 1);
    expect(style(y, "top")).toBe("40px");
    expect(style(y, "bottom")).toBe("40px");
    await atWidth(below("md"));
    expect(style(x, "top")).toBe("0px");
  });

  it("--size sets both dimensions", () => {
    const el = mount(`<div style="--size: 4"></div>`);
    expect(px(style(el, "inline-size"))).toBeCloseTo(scale(4), 1);
    expect(px(style(el, "block-size"))).toBeCloseTo(scale(4), 1);
  });

  it("a sizing keyword switches only its own utility: --h: 4 still scales next to --w: fit-content", async () => {
    await atWidth(at("md"));
    const el = mount(`<div style="--w: fit-content; --h: 4">x</div>`);
    expect(px(style(el, "block-size"))).toBeCloseTo(scale(4), 1);
    const img = mount(
      `<div style="inline-size: 800px"><div style="--w: 100%; --max-w: 56; --mx: auto">x</div></div>`,
    ).firstElementChild!;
    expect(px(style(img, "inline-size"))).toBeCloseTo(scale(56), 1);
  });

  it("numbers and keywords mix across one utility's tiers (claim 23)", async () => {
    const root = mount(`<div style="inline-size: 800px">
      <div data-up style="--w: 4; --w--md: fit-content">x</div>
      <div data-down style="--w: fit-content; --w--md: 4; --w--lg: 100%">x</div>
      <div data-grid style="--display: grid; --grid-cols: 2; --grid-cols--md: subgrid"><i></i><i></i></div>
    </div>`);
    const [up, down, grid] = ["[data-up]", "[data-down]", "[data-grid]"].map(
      (selector) => root.querySelector(selector)!,
    ) as [Element, Element, Element];
    await atWidth(below("md"));
    expect(px(style(up, "inline-size"))).toBeCloseTo(scale(4), 1);
    expect(px(style(down, "inline-size"))).toBeLessThan(scale(20));
    expect(tracks(grid)).toBe(2);
    await atWidth(at("md"));
    expect(px(style(up, "inline-size"))).not.toBeCloseTo(scale(4), 1);
    expect(px(style(down, "inline-size"))).toBeCloseTo(scale(4), 1);
    // subgrid outside a grid item behaves as none: the two items fall into one implicit track
    expect(tracks(grid)).toBe(1);
    await atWidth(at("lg"));
    expect(px(style(down, "inline-size"))).toBeCloseTo(800, 0);
  });

  it("--grid-cols takes subgrid besides a count; none is --grid-template-cols: none", async () => {
    await atWidth(at("md"));
    const parent = mount(
      `<div style="inline-size: 600px; --display: grid; --grid-cols: 3"><div style="--col-span: 3; --display: grid; --grid-cols: subgrid"><i></i><i></i><i></i></div></div>`,
    );
    const child = parent.firstElementChild!;
    expect(style(child, "grid-template-columns")).toMatch(/^subgrid/);
    expect(px(style(child.firstElementChild!, "inline-size"))).toBeCloseTo(200, 0);
    const none = mount(`<div style="--display: grid; --grid-template-cols: none"></div>`);
    expect(style(none, "grid-template-columns")).toBe("none");
  });

  it("--col-span spans, and --col-start / --col-end place lines like Tailwind", async () => {
    await atWidth(at("md"));
    const grid = mount(
      `<div style="--display: grid; --grid-cols: 4"><i style="--col-span: 2"></i><i style="--col-start: 2; --col-span: 3"></i><i style="--col-start: 1; --col-end: -1"></i><i style="--col-span--md: 4"></i></div>`,
    );
    const [span, startSpan, startEnd, tierOnly] = [...grid.children];
    expect(style(span!, "grid-column-start")).toBe("span 2");
    expect(style(startSpan!, "grid-column-start")).toBe("2");
    expect(style(startSpan!, "grid-column-end")).toBe("span 3");
    expect(style(startEnd!, "grid-column-end")).toBe("-1");
    expect(style(tierOnly!, "grid-column-start")).toBe("span 4");
    await atWidth(below("md"));
    expect(style(tierOnly!, "grid-column-start")).toBe("span 1");
  });

  it("--place-items and --place-content take the alignment keywords, safe variants included", async () => {
    await atWidth(at("md"));
    const grid = mount(
      `<div style="--display: grid; --place-items: center; --place-content: space-between"><i style="--display: grid; --place-items: safe end"></i><i style="--place-content--md: end"></i></div>`,
    );
    expect(style(grid, "align-items")).toBe("center");
    expect(style(grid, "justify-items")).toBe("center");
    expect(style(grid, "align-content")).toBe("space-between");
    expect(style(grid, "justify-content")).toBe("space-between");
    const [safe, tierOnly] = [...grid.children];
    expect(style(safe!, "align-items")).toBe("safe end");
    expect(style(tierOnly!, "align-content")).toBe("end");
    await atWidth(below("md"));
    expect(style(tierOnly!, "align-content")).toBe("normal");
  });

  it("a tier-only --col-span leaves a layout child in its band below the tier", async () => {
    const layout = mount(`<ui-layout><div style="--col-span--md: 2">x</div></ui-layout>`);
    await atWidth(below("md"));
    expect(style(layout.firstElementChild!, "grid-column-start")).not.toContain("span");
  });

  it("--grid-fit packs as many columns as fit the minimum", async () => {
    await atWidth(at("md"));
    const el = mount(
      `<div style="inline-size: 500px; --display: grid; --grid-fit: 12rem"><i></i><i></i><i></i><i></i></div>`,
    );
    expect(tracks(el)).toBe(2);
  });

  it("--line-clamp clamps and --text sizes", () => {
    const el = mount(`<p style="--line-clamp: 2; --font-size: 20px">lorem</p>`);
    expect(style(el, "-webkit-line-clamp")).toBe("2");
    expect(style(el, "overflow")).toBe("hidden");
    expect(style(el, "font-size")).toBe("20px");
  });

  it("--text-align--md: center alone is start below md (no-base allowlist)", async () => {
    const el = mount(`<p style="--text-align--md: center">x</p>`);
    await atWidth(below("md"));
    expect(style(el, "text-align")).toBe("start");
    await atWidth(at("md"));
    expect(style(el, "text-align")).toBe("center");
  });

  it("--rounded and --position are plain utilities", () => {
    const el = mount(`<div style="--rounded: 8px; --position: relative"></div>`);
    expect(style(el, "border-radius")).toBe("8px");
    expect(style(el, "position")).toBe("relative");
  });

  it("--display shorthands set the display and the flex direction together, per breakpoint", async () => {
    const root = mount(`<div>
      <div data-col style="--display: flex-col"></div>
      <div data-rev style="--display: inline-flex-row-reverse"></div>
      <div data-switch style="--display: flex-col; --display--md: flex-row"></div>
      <div data-reset style="--display: flex-col; --display--md: flex"></div>
      <div data-grid style="--display: flex-col; --display--md: grid"></div>
    </div>`);
    const at_ = (selector: string) => root.querySelector(selector)!;
    expect(style(at_("[data-col]"), "display")).toBe("flex");
    expect(style(at_("[data-col]"), "flex-direction")).toBe("column");
    expect(style(at_("[data-rev]"), "display")).toBe("inline-flex");
    expect(style(at_("[data-rev]"), "flex-direction")).toBe("row-reverse");
    await atWidth(below("md"));
    expect(style(at_("[data-switch]"), "flex-direction")).toBe("column");
    await atWidth(at("md"));
    expect(style(at_("[data-switch]"), "flex-direction")).toBe("row");
    // a plain display at a tier resets the direction it inherits from the base shorthand
    expect(style(at_("[data-reset]"), "display")).toBe("flex");
    expect(style(at_("[data-reset]"), "flex-direction")).toBe("row");
    expect(style(at_("[data-grid]"), "display")).toBe("grid");
  });
});
