"use strict";

/**
 * @fileoverview Utilities on the no-base allowlist apply a tier
 * without a base value on a plain element; utilities outside it do nothing.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

const tracks = (el: Element) => style(el, "grid-template-columns").trim().split(/\s+/).length;

describe("no-base tiers", () => {
  useKit();

  it("--display: grid; --grid-cols--md: 3 on a div is one column below md and three above", async () => {
    const el = mount(
      `<div style="--display: grid; --grid-cols--md: 3"><i></i><i></i><i></i></div>`,
    );
    await atWidth(below("md"));
    expect(style(el, "display")).toBe("grid");
    expect(tracks(el)).toBe(1);
    await atWidth(at("md"));
    expect(tracks(el)).toBe(3);
  });

  it("--display--md: none alone leaves display untouched", async () => {
    const el = mount(`<div style="--display--md: none"></div>`);
    await atWidth(at("md"));
    expect(style(el, "display")).toBe("block");
  });
});

describe("--display: grid packs its rows at the block start", () => {
  useKit();

  /** The block offset of each child from the container's top edge. */
  const offsets = (el: Element) => {
    const top = el.getBoundingClientRect().top;
    return [...el.children].map((child) => Math.round(child.getBoundingClientRect().top - top));
  };
  const TALL = `--h: 200px; --gap: 0`;
  const KIDS = `<i style="--display: block; --h: 20px"></i><i style="--display: block; --h: 20px"></i>`;

  it("auto rows in a taller grid sit at the top instead of spreading", () => {
    const el = mount(`<div style="--display: grid; ${TALL}">${KIDS}</div>`);
    expect(style(el, "align-content")).toBe("start");
    expect(offsets(el)).toEqual([0, 20]);
  });

  it("inline-grid gets the same default", () => {
    const el = mount(`<div style="--display: inline-grid; ${TALL}">${KIDS}</div>`);
    expect(offsets(el)).toEqual([0, 20]);
  });

  it("--place-content wins over the default, at the base and at a breakpoint", async () => {
    const base = mount(
      `<div style="--display: grid; --place-content: center; ${TALL}">${KIDS}</div>`,
    );
    expect(offsets(base)).toEqual([80, 100]);
    const tier = mount(
      `<div style="--display: grid; --place-content--md: end stretch; ${TALL}">${KIDS}</div>`,
    );
    await atWidth(below("md"));
    expect(offsets(tier)).toEqual([0, 20]);
    await atWidth(at("md"));
    expect(offsets(tier)).toEqual([160, 180]);
  });

  it("a grid-pile keeps centering its layers", () => {
    const el = mount(
      `<div style="--display: grid-pile; ${TALL}"><i style="--display: block; --h: 20px; --w: 20px"></i></div>`,
    );
    expect(offsets(el)).toEqual([90]);
  });

  it("--place-items or --items center a child in a sized grid, as without the default", () => {
    const ONE = `<i style="--display: block; --h: 20px"></i>`;
    for (const items of ["--place-items: center", "--items: center"]) {
      const el = mount(`<div style="--display: grid; ${items}; ${TALL}">${ONE}</div>`);
      expect(offsets(el), items).toEqual([90]);
      expect(style(el, "align-content"), items).toBe("normal");
    }
  });

  it("a breakpoint grid-pile keeps centering its layers", async () => {
    const el = mount(
      `<div style="--display: grid; --display--md: grid-pile; ${TALL}"><i style="--display: block; --h: 20px; --w: 20px"></i></div>`,
    );
    await atWidth(at("md"));
    expect(offsets(el)).toEqual([90]);
  });

  it("a primitive that centers with align-items keeps its label centered", () => {
    const button = mount(
      `<button data-ui="button" style="--display: grid; --h: 80px">Save</button>`,
    );
    expect(style(button, "align-content")).toBe("normal");
  });

  it("a primitive's own alignment beats the default", () => {
    const el = mount(
      `<div data-ui="card" style="--display: grid; --ui-card-place-content: end stretch; ${TALL}">${KIDS}</div>`,
    );
    expect(offsets(el).at(-1)).toBeGreaterThan(100);
  });

  it("a stretched callout, a full-height dialog body, and a tall layout keep their rows at the top", () => {
    const callout = mount(`<div data-ui="callout" style="${TALL}">${KIDS}</div>`);
    expect(style(callout, "align-content")).toBe("start");
    const dialog = mount(
      `<dialog data-ui="dialog"><div data-dialog-slot="content"><div data-dialog-slot="body">${KIDS}</div></div></dialog>`,
    );
    const body = dialog.querySelector("[data-dialog-slot~='body']")!;
    expect(style(body, "align-content")).toBe("start");
    const layout = mount(`<div data-ui="layout" style="${TALL}">${KIDS}</div>`);
    expect(offsets(layout)).toEqual([0, 20]);
  });
});
