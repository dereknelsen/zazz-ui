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

  it("a primitive keeps its own alignment until a pile is active, and after", async () => {
    const root = mount(`<div>
      <button data-ui="button" data-control>x</button>
      <button data-ui="button" data-tier style="--display--md: grid-pile">x</button>
      <button data-ui="button" data-base style="--display: inline-flex; --display--md: grid-pile">x</button>
    </div>`);
    const align = (selector: string) => style(root.querySelector(selector)!, "align-items");
    await atWidth(below("md"));
    expect(align("[data-tier]")).toBe(align("[data-control]"));
    expect(align("[data-base]")).toBe(align("[data-control]"));
  });

  it("the words grid-pile elsewhere in a style change nothing", () => {
    const root = mount(`<div>
      <button data-ui="button" data-control>x</button>
      <button data-ui="button" data-content style="--after-content: 'grid-pile'">x</button>
      <button data-ui="button" data-url style="background-image: url(grid-pile.svg)">x</button>
    </div>`);
    const align = (selector: string) => style(root.querySelector(selector)!, "align-items");
    expect(align("[data-content]")).toBe(align("[data-control]"));
    expect(align("[data-url]")).toBe(align("[data-control]"));
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
});
