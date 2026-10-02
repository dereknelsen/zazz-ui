"use strict";

/**
 * @fileoverview The border shorthand: `--border`, `--border-x`,
 * `--border-y`, and `--border-l/t/r/b` take a color (1px wide), a number
 * (that many px, --color-border), or a length (--color-border). Longhands win.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { mount, style, useKit } from "../../test/browser.ts";

const BOX = "inline-size: 40px; block-size: 40px;";

/** A CSS color as 0–255 RGBA, read back from a canvas pixel (format-independent). */
function rgba(color: string): number[] {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data];
}

function expectColor(actual: string, expected: string): void {
  const a = rgba(actual);
  const b = rgba(expected);
  a.forEach((channel, i) =>
    expect(Math.abs(channel - b[i]!), `${actual} vs ${expected}`).toBeLessThanOrEqual(2),
  );
}

/** Mounts several elements side by side (`mount` replaces whatever it mounted before). */
function mountAll(...html: string[]): HTMLElement[] {
  return [
    ...mount(
      `<div>${html.join("")}<i data-theme-border style="color: var(--color-border)"></i></div>`,
    ).children,
  ].slice(0, html.length) as HTMLElement[];
}

/** The theme's border color, computed independently of the shorthand. */
function themeBorder(): string {
  return style(document.querySelector("[data-theme-border]")!, "color");
}

const SIDES = ["left", "top", "right", "bottom"] as const;
const width = (el: Element, side: (typeof SIDES)[number]) => style(el, `border-${side}-width`);
const color = (el: Element, side: (typeof SIDES)[number]) => style(el, `border-${side}-color`);

describe("border shorthand", () => {
  useKit();

  it("a color is a 1px solid border in that color on every side", () => {
    const [el] = mountAll(`<div style="${BOX} --border: rgb(200, 10, 10)"></div>`);
    for (const side of SIDES) {
      expect(width(el, side), side).toBe("1px");
      expect(style(el, `border-${side}-style`), side).toBe("solid");
      expectColor(color(el, side), "rgb(200, 10, 10)");
    }
  });

  it("a number is that many px in --color-border, and a negative number is its absolute value", () => {
    const [two, neg] = mountAll(
      `<div style="${BOX} --border: 2"></div>`,
      `<div style="${BOX} --border: -3"></div>`,
    );
    expect(width(two, "top")).toBe("2px");
    expect(width(neg, "top")).toBe("3px");
    expectColor(color(two, "top"), themeBorder());
  });

  it("a negative length is its absolute value, like a negative number", () => {
    const [el] = mountAll(`<div style="${BOX} --border: -2px"></div>`);
    expect(width(el, "top")).toBe("2px");
  });

  it("a tier without a base draws nothing", async () => {
    const [el] = mountAll(`<button style="${BOX} --border--hover: 2">x</button>`);
    await userEvent.hover(el);
    expect(width(el, "top")).not.toBe("2px");
    await userEvent.unhover(el);
  });

  it("--group-border--hover follows the group's hover", async () => {
    const root = mount(
      `<div data-ui="group" style="${BOX}"><i data-child style="display: block; ${BOX} --border: rgb(200, 10, 10); --group-border--hover: rgb(10, 10, 200)"></i></div>`,
    );
    const child = root.querySelector("[data-child]")!;
    expectColor(color(child, "top"), "rgb(200, 10, 10)");
    await userEvent.hover(root);
    expectColor(color(child, "top"), "rgb(10, 10, 200)");
    await userEvent.unhover(root);
  });

  it("a length is used as the width, in --color-border", () => {
    const [px, rem] = mountAll(
      `<div style="${BOX} --border: 3px"></div>`,
      `<div style="${BOX} --border: 0.25rem"></div>`,
    );
    expect(width(px, "left")).toBe("3px");
    expect(width(rem, "left")).toBe("4px");
    expectColor(color(px, "left"), themeBorder());
  });

  it("--border-color and --border-width beat the shorthand", () => {
    const el = mount(
      `<div style="${BOX} --border: rgb(255, 255, 255); --border-color: rgb(0, 0, 0); --border-width: 5px"></div>`,
    );
    expectColor(color(el, "top"), "rgb(0, 0, 0)");
    expect(width(el, "top")).toBe("5px");
  });

  it("--border-width with --border-l gives a 2px left border in the shorthand's color; the color stays on the left", () => {
    const el = mount(
      `<div style="${BOX} --border-width: 2px; --border-l: rgb(200, 10, 10)"></div>`,
    );
    expect(width(el, "left")).toBe("2px");
    expectColor(color(el, "left"), "rgb(200, 10, 10)");
    expect(rgba(color(el, "top"))).not.toEqual(rgba("rgb(200, 10, 10)"));
  });

  it("--border-x covers only the inline sides and --border-y only the block sides", () => {
    const [x, y] = mountAll(
      `<div style="${BOX} --border-x: 2"></div>`,
      `<div style="${BOX} --border-y: 2"></div>`,
    );
    expect([width(x, "left"), width(x, "right"), width(x, "top")]).toEqual(["2px", "2px", "0px"]);
    expect([width(y, "top"), width(y, "bottom"), width(y, "left")]).toEqual(["2px", "2px", "0px"]);
  });

  it("a side beats its axis, and an axis beats --border", () => {
    const el = mount(
      `<div style="${BOX} --border: 2; --border-x: 3; --border-l: rgb(200, 10, 10)"></div>`,
    );
    expect(width(el, "top")).toBe("2px");
    expect(width(el, "right")).toBe("3px");
    expect(width(el, "left")).toBe("1px");
    expectColor(color(el, "left"), "rgb(200, 10, 10)");
  });

  it("--border-l is the inline start: the right side in RTL", () => {
    const el = mount(`<div dir="rtl" style="${BOX} --border-l: 2"></div>`);
    expect(width(el, "right")).toBe("2px");
    expect(width(el, "left")).toBe("0px");
  });

  it("--border-style overrides the solid default", () => {
    const el = mount(`<div style="${BOX} --border: 2; --border-style: dashed"></div>`);
    expect(style(el, "border-top-style")).toBe("dashed");
  });

  it("--border--hover changes the border while hovered", async () => {
    const el = mount(
      `<button style="${BOX} --border: rgb(200, 10, 10); --border--hover: rgb(10, 10, 200)">x</button>`,
    );
    expectColor(color(el, "top"), "rgb(200, 10, 10)");
    await userEvent.hover(el);
    expectColor(color(el, "top"), "rgb(10, 10, 200)");
    await userEvent.unhover(el);
  });

  it("applies on a primitive, over its own border", () => {
    const el = mount(`<button data-ui="button" style="--border: rgb(200, 10, 10)">x</button>`);
    expectColor(color(el, "top"), "rgb(200, 10, 10)");
    expect(width(el, "top")).toBe("1px");
  });
});
