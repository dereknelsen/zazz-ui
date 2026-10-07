"use strict";

/**
 * @fileoverview Color and the effects composition: `--bg` with alpha
 * over `light-dark()` tokens, state tiers on color, and ring + shadow sharing
 * one box-shadow.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

const BOX = "inline-size: 100px; block-size: 40px;";

describe("color and effects", () => {
  useKit();

  it("--bg with --bg-alpha renders the relative oklch color, over a light-dark() token too", () => {
    const root = mount(`
      <div>
        <div data-a style="${BOX} --bg: var(--color-primary); --bg-alpha: .5"></div>
        <div data-a-probe style="${BOX} background-color: oklch(from var(--color-primary) l c h / .5)"></div>
        <div data-b style="${BOX} --bg: var(--color-card)"></div>
        <div data-b-probe style="${BOX} background-color: oklch(from var(--color-card) l c h / 1)"></div>
      </div>
    `);
    const bg = (sel: string) => style(root.querySelector(sel)!, "background-color");
    expect(bg("[data-a]")).toBe(bg("[data-a-probe]"));
    expect(bg("[data-a]")).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg("[data-b]")).toBe(bg("[data-b-probe]"));
  });

  it("--text--hover changes the text color on hover", async () => {
    const el = mount(
      `<div style="${BOX} --text: rgb(255, 0, 0); --text--hover: rgb(0, 0, 255)">x</div>`,
    );
    expect(style(el, "color")).toBe("rgb(255, 0, 0)");
    await userEvent.hover(el);
    expect(style(el, "color")).toBe("rgb(0, 0, 255)");
    await userEvent.unhover(el);
  });

  it('--bg--current applies on [aria-current] (not "false"), on a link, a button, and in the group form', () => {
    const red = "rgb(255, 0, 0)";
    const root = mount(`<div>
      <a href="/a" data-page aria-current="page" style="${BOX} --display: block; --bg: transparent; --bg--current: ${red}">a</a>
      <a href="/b" data-false aria-current="false" style="${BOX} --display: block; --bg: transparent; --bg--current: ${red}">b</a>
      <a href="/c" data-none style="${BOX} --display: block; --bg: transparent; --bg--current: ${red}">c</a>
      <a href="/d" data-button data-ui="button" data-button-variant="ghost" aria-current="true" style="--bg--current: ${red}">d</a>
      <a href="/e" data-ui="group" aria-current="page"><span data-group style="${BOX} --display: block; --bg: transparent; --group-bg--current: ${red}">e</span></a>
      <div data-probe style="${BOX} --bg: ${red}"></div>
    </div>`);
    const bg = (sel: string) => style(root.querySelector(sel)!, "background-color");
    const current = bg("[data-probe]");
    expect(bg("[data-page]")).toBe(current);
    expect(bg("[data-button]")).toBe(red); // a primitive reads the resolver raw
    expect(bg("[data-group]")).toBe(current);
    expect(bg("[data-false]")).not.toBe(current);
    expect(bg("[data-none]")).not.toBe(current);
  });

  it("--ring and --shadow both appear in one box-shadow", () => {
    const el = mount(`<div style="${BOX} --ring: 2px; --shadow: 0 4px 8px rgb(0, 0, 0)"></div>`);
    const shadow = style(el, "box-shadow");
    expect(shadow).toContain("0px 0px 0px 2px");
    expect(shadow).toContain("0px 4px 8px");
  });

  it("--bg-linear / -radial / -conic compose background-image with --bg-stops", () => {
    const root = mount(`
      <div>
        <div data-linear style="${BOX} --bg-linear: to bottom in oklch; --bg-stops: red, blue 80%"></div>
        <div data-linear-probe style="${BOX} background-image: linear-gradient(to bottom in oklch, red, blue 80%)"></div>
        <div data-radial style="${BOX} --bg-radial: circle at center; --bg-stops: red, transparent"></div>
        <div data-conic style="${BOX} --bg-conic: from 45deg; --bg-stops: red, blue"></div>
        <div data-under style="${BOX} --bg: blue; --bg-linear: to right; --bg-stops: transparent, red"></div>
        <div data-under-probe style="${BOX} background-color: oklch(from blue l c h / 1)"></div>
      </div>
    `);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-linear]"), "background-image")).toBe(
      style(at("[data-linear-probe]"), "background-image"),
    );
    expect(style(at("[data-radial]"), "background-image")).toMatch(/^radial-gradient\(circle/);
    expect(style(at("[data-conic]"), "background-image")).toMatch(/^conic-gradient\(from 45deg/);
    // a --bg color sits under the gradient
    expect(style(at("[data-under]"), "background-color")).toBe(
      style(at("[data-under-probe]"), "background-color"),
    );
    expect(style(at("[data-under]"), "background-image")).toMatch(/^linear-gradient/);
  });

  it("--bg: none clears the color and the image, on a primitive too, and per state", async () => {
    const root = mount(`
      <div>
        <div data-plain style="${BOX} --bg: none; --bg-linear: to right; --bg-stops: red, blue"></div>
        <button data-ui="button" data-button-variant="primary" data-button style="--bg: none">x</button>
        <div data-hover style="${BOX} --bg-linear: to right; --bg-stops: red, blue; --bg: red; --bg--hover: none"></div>
      </div>
    `);
    const at = (selector: string) => root.querySelector(selector)!;
    for (const selector of ["[data-plain]", "[data-button]"]) {
      expect(style(at(selector), "background-color"), selector).toBe("rgba(0, 0, 0, 0)");
      expect(style(at(selector), "background-image"), selector).toBe("none");
    }
    expect(style(at("[data-hover]"), "background-image")).toMatch(/^linear-gradient/);
    await userEvent.hover(at("[data-hover]"));
    expect(style(at("[data-hover]"), "background-image")).toBe("none");
    expect(style(at("[data-hover]"), "background-color")).toBe("rgba(0, 0, 0, 0)");
  });

  it("--bg, --text and --border-color take breakpoint tiers, and a state still beats them", async () => {
    const el = mount(
      `<div style="${BOX} --bg: rgb(255, 255, 255); --bg--md: rgb(0, 0, 0); --bg--hover: rgb(0, 128, 0); --text: rgb(1, 1, 1); --text--lg: rgb(2, 2, 2)">x</div>`,
    );
    const probe = (color: string) => {
      const p = document.createElement("i");
      p.style.cssText = `background-color: oklch(from ${color} l c h / 1)`;
      document.body.append(p);
      const value = style(p, "background-color");
      p.remove();
      return value;
    };
    await atWidth(below("md"));
    expect(style(el, "background-color")).toBe(probe("rgb(255, 255, 255)"));
    await atWidth(at("md"));
    expect(style(el, "background-color")).toBe(probe("rgb(0, 0, 0)"));
    expect(style(el, "color")).toBe("rgb(1, 1, 1)");
    await userEvent.hover(el);
    expect(style(el, "background-color")).toBe(probe("rgb(0, 128, 0)"));
    await userEvent.unhover(el);
    await atWidth(at("lg"));
    expect(style(el, "color")).toBe("rgb(2, 2, 2)");
  });

  it("--bg--md: none clears a gradient from md up", async () => {
    const el = mount(
      `<div style="${BOX} --bg-linear: to right; --bg-stops: red, blue; --bg: red; --bg--md: none">x</div>`,
    );
    await atWidth(below("md"));
    expect(style(el, "background-image")).toMatch(/^linear-gradient/);
    await atWidth(at("md"));
    expect(style(el, "background-image")).toBe("none");
    expect(style(el, "background-color")).toBe("rgba(0, 0, 0, 0)");
  });
});
