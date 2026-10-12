"use strict";

/**
 * @fileoverview Breakpoint tiers query the nearest inline-size container, in
 * rem (the same in any font): html when nothing closer is, a layout band's
 * child, or any `data-ui="container"`. Body, main and the sectioning elements
 * are not containers. The --layout-* widths use the same rem scale; html's
 * containment places boxes exactly where body's used to.
 */

import { describe, expect, it } from "vite-plus/test";
import { allFragments, atWidth, frame, mount, useKit } from "../../test/browser.ts";

const width = (el: Element) => el.getBoundingClientRect().width;

describe("breakpoint tiers", () => {
  useKit();

  it("follow the page container when nothing closer is, flipping at md (48rem)", async () => {
    const probe = mount(
      `<div><div><div data-probe style="--w: 1rem; --w--md: 2rem"></div></div></div>`,
    ).querySelector("[data-probe]")!;
    await atWidth(767);
    expect(width(probe)).toBe(16);
    await atWidth(768);
    expect(width(probe)).toBe(32);
  });

  it("follow the page past body, main and sectioning elements, however narrow", async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <main style="inline-size: 300px"><div data-main style="--w: 1rem; --w--md: 2rem"></div></main>
      <section style="inline-size: 300px"><div data-section style="--w: 1rem; --w--md: 2rem"></div></section>
      <article style="inline-size: 300px"><div data-article style="--w: 1rem; --w--md: 2rem"></div></article>
      <header style="inline-size: 300px"><div data-header style="--w: 1rem; --w--md: 2rem"></div></header>
      <footer style="inline-size: 300px"><div data-footer style="--w: 1rem; --w--md: 2rem"></div></footer>
    </div>`);
    for (const tag of ["main", "section", "article", "header", "footer"]) {
      expect(getComputedStyle(root.querySelector(tag)!).containerType, tag).toBe("normal");
      expect(width(root.querySelector(`[data-${tag}]`)!), tag).toBe(32);
    }
    expect(getComputedStyle(document.body).containerType).toBe("normal");
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

  it("flip at the same width in any container font", async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <div data-ui="container" style="inline-size: 768px; font-size: 2rem; font-family: monospace">
        <div data-big style="--w: 1rem; --w--md: 2rem"></div>
      </div>
      <div data-ui="container" style="inline-size: 767px; font-size: 0.75rem">
        <div data-small style="--w: 1rem; --w--md: 2rem"></div>
      </div>
    </div>`);
    // md is 48rem of the root (768px), whatever the container's own font
    expect(width(root.querySelector("[data-big]")!)).toBe(32);
    expect(width(root.querySelector("[data-small]")!)).toBe(16);
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
    // the sm band is 40rem (640px): xl (80rem) does not fit, even on a 1400px page
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

describe("html as the page container", () => {
  useKit();

  it("places every box of every primitive fragment where a body container did", async () => {
    await atWidth(1024);
    const root = mount(`<div>${allFragments()}</div>`);
    const fingerprint = () =>
      [...root.querySelectorAll("*")].map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName}:${r.x},${r.y},${r.width},${r.height}`;
      });
    const before = fingerprint();
    expect(before.length).toBeGreaterThan(5);
    // body has the same width, so moving the page container there moves nothing
    const override = document.createElement("style");
    override.textContent = `html { container-type: normal; } body { container-type: inline-size; }`;
    document.head.append(override);
    await frame();
    expect(fingerprint()).toEqual(before);
    override.remove();
  });
});
