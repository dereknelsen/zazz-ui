"use strict";

/**
 * @fileoverview `--radius`: a number is that many `--spacing` steps times
 * `--radius-multiplier`, a length passes through, `full` is a pill; it takes
 * states and breakpoints, works tier-only, and a primitive's radius hook takes
 * a number too.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { at, atWidth, below, mount, scale, style, useKit } from "../../test/browser.ts";

const BOX = "display: block; inline-size: 100px; block-size: 40px;";
const radius = (el: Element) => Number.parseFloat(style(el, "border-top-left-radius"));

describe("--radius", () => {
  useKit();

  it("a number is that many spacing steps, the same as the matching token", () => {
    const root = mount(
      `<div><i data-n style="${BOX} --radius: 2.5"></i><i data-token style="${BOX} border-radius: var(--radius-md)"></i></div>`,
    );
    expect(radius(root.querySelector("[data-n]")!)).toBeCloseTo(scale(2.5), 1);
    expect(style(root.querySelector("[data-n]")!, "border-top-left-radius")).toBe(
      style(root.querySelector("[data-token]")!, "border-top-left-radius"),
    );
  });

  it("follows --radius-multiplier", () => {
    const el = mount(
      `<div style="--radius-multiplier: 2"><i style="${BOX} --radius: 2"></i></div>`,
    ).firstElementChild!;
    expect(radius(el)).toBeCloseTo(scale(4), 1);
  });

  it("a length passes through, and full is the pill token", () => {
    const root = mount(
      `<div><i data-len style="${BOX} --radius: 12px"></i><i data-full style="${BOX} --radius: full"></i><i data-token style="${BOX} border-radius: var(--radius-full)"></i></div>`,
    );
    expect(style(root.querySelector("[data-len]")!, "border-top-left-radius")).toBe("12px");
    expect(style(root.querySelector("[data-full]")!, "border-top-left-radius")).toBe(
      style(root.querySelector("[data-token]")!, "border-top-left-radius"),
    );
  });

  it("takes a state tier and a breakpoint tier, and a tier alone on a plain element", async () => {
    const root = mount(
      `<div><i data-hover style="${BOX} --radius: 1; --radius--hover: 4"></i><i data-md style="${BOX} --radius--md: full"></i></div>`,
    );
    const hover = root.querySelector("[data-hover]")!;
    const md = root.querySelector("[data-md]")!;
    expect(radius(hover)).toBeCloseTo(scale(1), 1);
    await userEvent.hover(hover);
    expect(radius(hover)).toBeCloseTo(scale(4), 1);
    await userEvent.unhover(hover);
    await atWidth(below("md"));
    expect(radius(md)).toBe(0);
    await atWidth(at("md"));
    expect(radius(md)).toBeGreaterThan(1000);
  });

  it("a primitive's radius hook takes a number, and the utility overrides it", () => {
    const root = mount(
      `<div><button data-ui="button" data-hook style="--ui-button-radius: 4">a</button><button data-ui="button" data-utility style="--radius: 1">b</button></div>`,
    );
    expect(radius(root.querySelector("[data-hook]")!)).toBeCloseTo(scale(4), 1);
    expect(radius(root.querySelector("[data-utility]")!)).toBeCloseTo(scale(1), 1);
  });

  it("--before-radius takes a number on the pseudo-element", () => {
    const el = mount(
      `<span style="--display: inline-block; --before-content: ''; --before-display: block; --before-w: 4; --before-h: 4; --before-radius: 2"></span>`,
    );
    expect(Number.parseFloat(style(el, "border-top-left-radius", "::before"))).toBeCloseTo(
      scale(2),
      1,
    );
  });

  it("--radius-t and the other sides round two logical corners, over --radius", async () => {
    const root = mount(`<div>
      <i data-t style="${BOX} --radius-t: 2"></i>
      <i data-mixed style="${BOX} --radius: 1; --radius-b--md: 0"></i>
      <i data-l style="${BOX} --radius-l: full"></i>
    </div>`);
    const t = root.querySelector("[data-t]")!;
    expect(radius(t)).toBeCloseTo(scale(2), 1);
    expect(Number.parseFloat(style(t, "border-top-right-radius"))).toBeCloseTo(scale(2), 1);
    expect(style(t, "border-bottom-left-radius")).toBe("0px");
    const mixed = root.querySelector("[data-mixed]")!;
    await atWidth(below("md"));
    expect(Number.parseFloat(style(mixed, "border-bottom-left-radius"))).toBeCloseTo(scale(1), 1);
    await atWidth(at("md"));
    expect(style(mixed, "border-bottom-left-radius")).toBe("0px");
    expect(radius(mixed)).toBeCloseTo(scale(1), 1);
    const l = root.querySelector("[data-l]")!;
    expect(Number.parseFloat(style(l, "border-bottom-left-radius"))).toBeGreaterThan(10);
    expect(style(l, "border-top-right-radius")).toBe("0px");
  });

  it("--before-radius takes full", () => {
    const el = mount(
      `<span style="--display: inline-block; --before-content: ''; --before-display: block; --before-w: 4; --before-h: 4; --before-radius: full"></span>`,
    );
    expect(Number.parseFloat(style(el, "border-top-left-radius", "::before"))).toBeGreaterThan(
      1000,
    );
  });

  it("a number in the OTP cell and tabs track hooks rounds the parts that read them", () => {
    const root = mount(`<div>
      <div data-ui="otp" style="--ui-otp-cell-radius: 3"><span data-otp-slot="cell" style="display: block; inline-size: 2rem; block-size: 2rem"></span></div>
      <div data-ui="tabs" style="--ui-tabs-track-radius: 3"><div data-tabs-slot="list"></div></div>
    </div>`);
    expect(radius(root.querySelector("[data-tabs-slot~='list']")!)).toBeCloseTo(scale(3), 0);
    expect(radius(root.querySelector("[data-otp-slot~='cell']")!)).toBeCloseTo(scale(3), 0);
  });
});
