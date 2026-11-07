"use strict";

/**
 * @fileoverview `--display: grid-pile` stacks every direct child in one grid
 * cell, centered, at the base or from a breakpoint up. A later tier naming any
 * other display ends the pile for the children too.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

const top = (el: Element) => el.getBoundingClientRect().top;

describe("--display: grid-pile", () => {
  useKit();

  it("stacks every child in one cell, centered", () => {
    const root = mount(
      `<div style="--display: grid-pile"><span data-a>a</span><span data-b>b</span></div>`,
    );
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    expect(style(root, "display")).toBe("grid");
    expect(style(root, "place-items")).toBe("center");
    expect(top(a)).toBe(top(b));
  });

  it("reaches direct children only", () => {
    const root = mount(
      `<div style="--display: grid-pile"><div data-child><span data-grandchild>a</span></div></div>`,
    );
    expect(style(root.querySelector("[data-child]")!, "grid-row-start")).toBe("1");
    expect(style(root.querySelector("[data-grandchild]")!, "grid-row-start")).toBe("auto");
  });

  it("turns on at a breakpoint", async () => {
    const root = mount(
      `<div style="--display: block; --display--md: grid-pile"><span data-a>a</span><span data-b style="--display: block">b</span></div>`,
    );
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    await atWidth(below("md"));
    expect(style(root, "display")).toBe("block");
    expect(style(a, "grid-row-start")).toBe("auto");
    await atWidth(at("md"));
    expect(style(root, "display")).toBe("grid");
    expect(top(a)).toBe(top(b));
  });

  it("ends at a tier that names another display", async () => {
    const root = mount(
      `<div style="--display: grid-pile; --display--md: flex"><span data-a>a</span></div>`,
    );
    const a = root.querySelector("[data-a]")!;
    await atWidth(at("md"));
    expect(style(root, "display")).toBe("flex");
    expect(style(root, "place-items")).toBe("normal");
    expect(style(a, "grid-row-start")).toBe("auto");
  });

  it("gives way to --place-items, base or tier alone", async () => {
    const root = mount(`<div>
      <div data-base style="--display: grid-pile; --place-items: start"></div>
      <div data-tier style="--display: grid-pile; --place-items--md: end"></div>
    </div>`);
    await atWidth(at("md"));
    expect(style(root.querySelector("[data-base]")!, "place-items")).toBe("start");
    expect(style(root.querySelector("[data-tier]")!, "place-items")).toBe("end");
  });

  it("an inactive pile leaves a primitive's alignment alone", async () => {
    const root = mount(`<div>
      <ui-button-group data-tier style="--display--md: grid-pile"></ui-button-group>
      <ui-button-group data-base style="--display: inline-flex; --display--md: grid-pile"></ui-button-group>
    </div>`);
    const align = (selector: string) => style(root.querySelector(selector)!, "align-items");
    await atWidth(below("md"));
    expect(align("[data-tier]")).toBe("stretch");
    expect(align("[data-base]")).toBe("stretch");
  });

  it("the words grid-pile elsewhere in a style change nothing", () => {
    const root = mount(`<div>
      <ui-button-group data-content style="--after-content: 'grid-pile'"></ui-button-group>
      <ui-button-group data-url style="background-image: url(grid-pile.svg)"></ui-button-group>
    </div>`);
    const align = (selector: string) => style(root.querySelector(selector)!, "align-items");
    expect(align("[data-content]")).toBe("stretch");
    expect(align("[data-url]")).toBe("stretch");
  });

  it("a tier-only two-value --place-items sets both axes", async () => {
    const root = mount(`<div style="--display: grid-pile; --place-items--md: end start"></div>`);
    await atWidth(below("md"));
    expect(style(root, "align-items")).toBe("center");
    await atWidth(at("md"));
    expect(style(root, "align-items")).toBe("end");
    expect(style(root, "justify-items")).toBe("start");
  });

  it("a tier-only --items leaves a primitive alone while the pile is inactive", async () => {
    const root = mount(
      `<ui-button-group style="--display--md: grid-pile; --items--lg: end"></ui-button-group>`,
    );
    await atWidth(below("md"));
    expect(style(root, "align-items")).toBe("stretch");
    await atWidth(at("md"));
    expect(style(root, "align-items")).toBe("center");
    await atWidth(at("lg"));
    expect(style(root, "align-items")).toBe("end");
  });

  it("gives way to --items, base or tier alone", async () => {
    const root = mount(`<div>
      <div data-base style="--display: grid-pile; --items: end"></div>
      <div data-tier style="--display: grid-pile; --items--md: end"></div>
    </div>`);
    const align = (selector: string) => style(root.querySelector(selector)!, "align-items");
    await atWidth(below("md"));
    expect(align("[data-base]")).toBe("end");
    expect(align("[data-tier]")).toBe("center");
    await atWidth(at("md"));
    expect(align("[data-tier]")).toBe("end");
  });

  it("an active pile beats a primitive's alignment, and ending it hands that back", async () => {
    const root = mount(`<div>
      <ui-button-group data-control></ui-button-group>
      <ui-button-group data-pile style="--display: grid-pile"></ui-button-group>
      <ui-button-group data-tier style="--display--md: grid-pile"></ui-button-group>
      <ui-button-group data-ended style="--display: grid-pile; --display--md: flex"></ui-button-group>
    </div>`);
    const align = (selector: string) => style(root.querySelector(selector)!, "align-items");
    await atWidth(below("md"));
    expect(align("[data-control]")).toBe("stretch");
    expect(align("[data-pile]")).toBe("center");
    expect(align("[data-tier]")).toBe("stretch");
    expect(align("[data-ended]")).toBe("center");
    await atWidth(at("md"));
    expect(align("[data-tier]")).toBe("center");
    expect(align("[data-ended]")).toBe("stretch");
  });

  it("ending a pile keeps the element's own --place-items", async () => {
    const root = mount(
      `<div style="--display: grid-pile; --display--md: grid; --place-items: end"></div>`,
    );
    await atWidth(at("md"));
    expect(style(root, "place-items")).toBe("end");
  });
});
