"use strict";

/**
 * @fileoverview Breakpoint tiers query the nearest inline-size container, in
 * ch of that container's font: the page containers (html, body, sectioning
 * elements) when nothing closer is, a layout band's child, or any
 * `data-ui="container"`. The --layout-* widths are rem, independent of the
 * font; dropping html's containment moves nothing (body has the same width).
 */

import { describe, expect, it } from "vite-plus/test";
import { allFragments, atWidth, frame, mount, useKit } from "../../test/browser.ts";
import { BREAKPOINT_CH } from "./utilities.ts";

const width = (el: Element) => el.getBoundingClientRect().width;

/** 65ch (md) of a given element's font, in px. */
function mdPx(host: Element = document.body): number {
  const ruler = document.createElement("div");
  ruler.style.cssText = `position: absolute; inline-size: ${BREAKPOINT_CH.md}ch`;
  host.append(ruler);
  const px = width(ruler);
  ruler.remove();
  return px;
}

describe("breakpoint tiers", () => {
  useKit();

  it("follow the page container when nothing closer is, flipping at md (65ch)", async () => {
    const probe = mount(
      `<div><div><div data-probe style="--w: 1rem; --w--md: 2rem"></div></div></div>`,
    ).querySelector("[data-probe]")!;
    const md = mdPx();
    await atWidth(Math.floor(md) - 1);
    expect(width(probe)).toBe(16);
    await atWidth(Math.ceil(md));
    expect(width(probe)).toBe(32);
  });

  it('follow the nearest data-ui="container" instead of the page', async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <div data-ui="container" style="inline-size: 300px"><div data-narrow style="--w: 1rem; --w--md: 2rem"></div></div>
      <div data-ui="container" style="inline-size: 1000px"><div data-wide style="--w: 1rem; --w--md: 2rem"></div></div>
    </div>`);
    expect(width(root.querySelector("[data-narrow]")!)).toBe(16);
    expect(width(root.querySelector("[data-wide]")!)).toBe(32);
  });

  it("on a container read the container above it, never itself", async () => {
    await atWidth(1400);
    const box = mount(
      `<div data-ui="container" style="inline-size: 300px; --h: 1rem; --h--md: 2rem"></div>`,
    );
    // its own --h--md answers to the page (wide), not to its own 300px
    expect(box.getBoundingClientRect().height).toBe(32);
  });

  it("resolve ch against the container's font, so a larger font raises the threshold", async () => {
    await atWidth(1400);
    const root = mount(`<div data-ui="container" style="inline-size: 900px; font-size: 2rem">
      <div data-probe style="--w: 1rem; --w--md: 2rem"></div>
    </div>`);
    // 65ch at 32px is wider than 900px, so md does not apply inside
    expect(mdPx(root)).toBeGreaterThan(900);
    expect(width(root.querySelector("[data-probe]")!)).toBe(16);
  });

  it("the --layout-* widths are rem, the same in any font", () => {
    const root = mount(`<div style="font-size: 2rem; font-family: monospace">
      <div data-big style="inline-size: var(--layout-md)"></div>
    </div>`);
    expect(width(root.querySelector("[data-big]")!)).toBe(768);
  });

  it("follow a layout band's width inside a layout, not the full-width section", async () => {
    await atWidth(1400);
    const root = mount(`<ui-layout data-layout-size="sm">
      <div><div data-probe style="--w: 1rem; --w--xl: 2rem"></div></div>
    </ui-layout>`);
    // the sm band is 40rem (640px): xl (120ch) does not fit, even on a 1400px page
    expect(width(root.querySelector("[data-probe]")!)).toBe(16);
  });

  it("keep subgrids and content-sized children of a layout uncontained", () => {
    const root = mount(`<ui-layout>
      <ui-layout data-nested></ui-layout>
      <div data-sub style="--display: grid; --template-cols: subgrid"></div>
      <a data-fit style="--w: fit-content">fit</a>
      <div data-plain></div>
    </ui-layout>`);
    const type = (selector: string) =>
      getComputedStyle(root.querySelector(selector)!).containerType;
    expect(type("[data-nested]")).toBe("normal");
    expect(type("[data-sub]")).toBe("normal");
    expect(type("[data-fit]")).toBe("normal");
    expect(type("[data-plain]")).toBe("inline-size");
  });
});

describe("html as an inline-size container", () => {
  useKit();

  it("leaves every box of every primitive fragment where it was", async () => {
    await atWidth(1024);
    const root = mount(`<div>${allFragments()}</div>`);
    const fingerprint = () =>
      [...root.querySelectorAll("*")].map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName}:${r.x},${r.y},${r.width},${r.height}`;
      });
    const before = fingerprint();
    expect(before.length).toBeGreaterThan(5);
    // body is an inline-size container of the same width, so tiers keep answering to it
    const override = document.createElement("style");
    override.textContent = `html { container-type: normal; }`;
    document.head.append(override);
    await frame();
    expect(fingerprint()).toEqual(before);
    override.remove();
  });
});
