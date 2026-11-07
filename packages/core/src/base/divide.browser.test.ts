"use strict";

/**
 * @fileoverview `--divide`, `--divide-x`, `--divide-y`: a border between direct
 * children, in the border shorthand's grammar plus `none`. An axis beats the
 * shorthand, breakpoints apply, nesting keeps each level's own divider, and a
 * child's own border utilities win.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

const end = (el: Element, axis: "inline" | "block") => style(el, `border-${axis}-end-width`);
const kids = `<p data-a>a</p><p data-b>b</p><p data-c>c</p>`;

function children(root: Element): Element[] {
  return ["[data-a]", "[data-b]", "[data-c]"].map((selector) => root.querySelector(selector)!);
}

describe("--divide", () => {
  useKit();

  it("--divide-x draws between children on the inline axis only, skipping the last", () => {
    const root = mount(`<div style="--divide-x: 1">${kids}</div>`);
    const [a, b, c] = children(root);
    expect(end(a!, "inline")).toBe("1px");
    expect(style(b!, "border-inline-end-style")).toBe("solid");
    expect(end(c!, "inline")).toBe("0px");
    expect(end(a!, "block")).toBe("0px");
  });

  it("--divide-y draws on the block axis only", () => {
    const root = mount(`<div style="--divide-y: 1">${kids}</div>`);
    const [a] = children(root);
    expect(end(a!, "block")).toBe("1px");
    expect(end(a!, "inline")).toBe("0px");
  });

  it("--divide draws both axes", () => {
    const root = mount(`<div style="--divide: 1">${kids}</div>`);
    const [a] = children(root);
    expect(end(a!, "block")).toBe("1px");
    expect(end(a!, "inline")).toBe("1px");
  });

  it("takes the border grammar: a number, a length, or a color", () => {
    const root = mount(`<div>
      <div data-n style="--divide-y: 2"><p>a</p><p>b</p></div>
      <div data-l style="--divide-y: 3px"><p>a</p><p>b</p></div>
      <div data-k style="--divide-y: rgb(200, 10, 10)"><p>a</p><p>b</p></div>
      <i data-probe style="color: color-mix(in oklch, rgb(200, 10, 10) 100%, var(--color-border))"></i>
      <i data-default style="color: var(--color-border)"></i>
    </div>`);
    const first = (selector: string) => root.querySelector(selector)!.firstElementChild!;
    expect(end(first("[data-n]"), "block")).toBe("2px");
    expect(style(first("[data-n]"), "border-block-end-color")).toBe(
      style(root.querySelector("[data-default]")!, "color"),
    );
    expect(end(first("[data-l]"), "block")).toBe("3px");
    expect(end(first("[data-k]"), "block")).toBe("1px");
    expect(style(first("[data-k]"), "border-block-end-color")).toBe(
      style(root.querySelector("[data-probe]")!, "color"),
    );
  });

  it("none draws nothing, and an axis beats the shorthand", () => {
    const root = mount(`<div>
      <div data-none style="--divide: none"><p>a</p><p>b</p></div>
      <div data-axis style="--divide: none; --divide-x: 1"><p>a</p><p>b</p></div>
      <div data-off style="--divide: 1; --divide-y: none"><p>a</p><p>b</p></div>
    </div>`);
    const first = (selector: string) => root.querySelector(selector)!.firstElementChild!;
    expect(end(first("[data-none]"), "inline")).toBe("0px");
    expect(end(first("[data-none]"), "block")).toBe("0px");
    expect(end(first("[data-axis]"), "inline")).toBe("1px");
    expect(end(first("[data-axis]"), "block")).toBe("0px");
    expect(end(first("[data-off]"), "inline")).toBe("1px");
    expect(end(first("[data-off]"), "block")).toBe("0px");
  });

  it("flips axis at a breakpoint", async () => {
    const root = mount(
      `<div style="--divide-y: 1; --divide-y--md: none; --divide-x--md: 1">${kids}</div>`,
    );
    const [a] = children(root);
    await atWidth(below("md"));
    expect(end(a!, "block")).toBe("1px");
    expect(end(a!, "inline")).toBe("0px");
    await atWidth(at("md"));
    expect(end(a!, "block")).toBe("0px");
    expect(end(a!, "inline")).toBe("1px");
  });

  it("a tier applies with no base", async () => {
    const root = mount(`<div style="--divide--md: 2">${kids}</div>`);
    const [a] = children(root);
    await atWidth(below("md"));
    expect(end(a!, "block")).toBe("0px");
    await atWidth(at("md"));
    expect(end(a!, "block")).toBe("2px");
  });

  it("reaches direct children only", () => {
    const root = mount(`<div style="--divide-y: 2"><p>a <i data-g>b</i></p><p>c</p></div>`);
    expect(end(root.querySelector("[data-g]")!, "block")).toBe("0px");
  });

  it("nesting keeps each level's own divider, at any depth", () => {
    const root = mount(`<div style="--divide-y: 2">
      <div data-l1 style="--divide-y: 3px">
        <div data-l2 style="--divide-y: 5px"><p data-l3>a</p><p>b</p></div>
        <p>c</p>
      </div>
      <p>d</p>
    </div>`);
    expect(end(root.querySelector("[data-l1]")!, "block")).toBe("2px");
    expect(end(root.querySelector("[data-l2]")!, "block")).toBe("3px");
    expect(end(root.querySelector("[data-l3]")!, "block")).toBe("5px");
  });

  it("a child's border utilities override the divider", () => {
    const root = mount(`<div style="--divide-y: 2">
      <p data-side style="--border-b: 0">a</p>
      <p data-width style="--border-width: 4px">b</p>
      <p data-color style="--border-color: rgb(1, 2, 3)">c</p>
      <p data-style style="--border-style: dashed">d</p>
      <p>e</p>
    </div>`);
    expect(end(root.querySelector("[data-side]")!, "block")).toBe("0px");
    expect(end(root.querySelector("[data-width]")!, "block")).toBe("4px");
    expect(style(root.querySelector("[data-color]")!, "border-block-end-color")).toBe(
      "rgb(1, 2, 3)",
    );
    expect(style(root.querySelector("[data-style]")!, "border-block-end-style")).toBe("dashed");
  });

  it("beats a primitive's own border", () => {
    const root = mount(
      `<div style="--divide-y: 3px"><button data-ui="button">a</button><button data-ui="button">b</button></div>`,
    );
    expect(end(root.firstElementChild!, "block")).toBe("3px");
  });
});
