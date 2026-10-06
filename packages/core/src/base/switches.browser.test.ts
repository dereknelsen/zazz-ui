"use strict";

/**
 * @fileoverview Switches: `data-ui="sr-only"` hides visually and keeps
 * the element in the accessibility tree; `pile` stacks children in one grid
 * area (grid by default); `isolate` starts a stacking context.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../test/browser.ts";

describe("switches", () => {
  useKit();

  it("sr-only clips the element to one pixel without hiding it", () => {
    const root = mount(
      `<div><legend data-ui="sr-only" data-hidden>Contact</legend><span>visible</span></div>`,
    );
    const hidden = root.querySelector("[data-hidden]")!;
    expect(style(hidden, "position")).toBe("absolute");
    expect(style(hidden, "inline-size")).toBe("1px");
    expect(style(hidden, "display")).not.toBe("none");
    expect(style(hidden, "visibility")).toBe("visible");
  });

  it("pile stacks every child in one grid area", () => {
    const root = mount(`<div data-ui="pile"><span data-a>a</span><span data-b>b</span></div>`);
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    expect(style(a, "grid-area")).toBe(style(b, "grid-area"));
    expect(a.getBoundingClientRect().top).toBe(b.getBoundingClientRect().top);
  });

  it("isolate starts a stacking context and stacks with other tokens", () => {
    const root = mount(`<div data-ui="pile isolate"><span>a</span></div>`);
    expect(style(root, "isolation")).toBe("isolate");
    expect(style(root, "display")).toBe("grid");
  });

  it("divide-x / divide-y draw a border between direct children, sized and colored by --divide", () => {
    const root = mount(`<div>
      <div data-ui="divide-x" data-x><span>a</span><span>b</span><span>c</span></div>
      <div data-ui="divide-y" data-y style="--divide: rgb(200, 10, 10)"><p>a</p><p>b</p></div>
      <div data-ui="divide-y" data-n style="--divide: 2"><p>a</p><p><i data-grandchild>b</i></p></div>
      <i data-probe style="color: color-mix(in oklch, rgb(200, 10, 10) 100%, var(--color-border))"></i>
    </div>`);
    const [a, b, c] = root.querySelector("[data-x]")!.children;
    expect(style(a!, "border-inline-end-width")).toBe("1px");
    expect(style(b!, "border-inline-end-style")).toBe("solid");
    expect(style(c!, "border-inline-end-width")).toBe("0px");
    expect(style(a!, "border-block-end-width")).toBe("0px");
    const [p] = root.querySelector("[data-y]")!.children;
    expect(style(p!, "border-block-end-width")).toBe("1px");
    // the channel mixes the color through oklch, so compare with the same mix
    expect(style(p!, "border-block-end-color")).toBe(
      style(root.querySelector("[data-probe]")!, "color"),
    );
    const [n] = root.querySelector("[data-n]")!.children;
    expect(style(n!, "border-block-end-width")).toBe("2px");
    expect(style(root.querySelector("[data-grandchild]")!, "border-block-end-width")).toBe("0px");
  });

  it("container makes an inline-size query container, and keeps scroll-state on a sticky one", () => {
    const root = mount(`<div>
      <div data-ui="container" data-plain></div>
      <div data-ui="container" data-sticky style="--position: sticky; --top: 0"></div>
    </div>`);
    expect(style(root.querySelector("[data-plain]")!, "container-type")).toBe("inline-size");
    const sticky = style(root.querySelector("[data-sticky]")!, "container-type");
    expect(sticky).toContain("inline-size");
    if (CSS.supports("container-type", "scroll-state")) expect(sticky).toContain("scroll-state");
  });
});
