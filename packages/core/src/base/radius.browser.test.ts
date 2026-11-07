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

describe("corner shape", () => {
  useKit();

  const shape = (el: Element, pseudo?: "::before") => style(el, "corner-shape", pseudo);
  /** A value's computed form: Chromium serializes keywords as superellipse(). Mounts, so
   * it replaces the fixture: read it before mounting the element under test. */
  const computed = (value: string) => shape(mount(`<i style="corner-shape: ${value}"></i>`));
  const token = () => computed("var(--radius-corner-shape)");
  const round = () => computed("round");
  const bevel = () => computed("bevel");

  it("--radius and its corner forms pick up the token", () => {
    const expected = token();
    expect(expected).not.toBe(round());
    const root = mount(
      `<div><i data-all style="${BOX} --radius: 2"></i><i data-top style="${BOX} --radius-t: 2"></i></div>`,
    );
    expect(shape(root.querySelector("[data-all]")!)).toBe(expected);
    expect(shape(root.querySelector("[data-top]")!)).toBe(expected);
  });

  it("a tier-only radius picks up the token", () => {
    const el = mount(`<div><i style="${BOX} --radius--md: 2"></i></div>`).firstElementChild!;
    expect(shape(el)).toBe(token());
  });

  it("an element with no radius utility keeps the initial shape", () => {
    expect(shape(mount(`<i style="${BOX}"></i>`))).toBe(round());
  });

  it("--radius: full stays round", () => {
    expect(shape(mount(`<i style="${BOX} --radius: full"></i>`))).toBe(round());
  });

  it("--radius: full beats a primitive's hook, and --corner-shape beats full", () => {
    const [expectedRound, expectedBevel] = [round(), bevel()];
    expect(shape(mount(`<span data-ui="badge" style="--radius: full">a</span>`))).toBe(
      expectedRound,
    );
    expect(shape(mount(`<i style="${BOX} --radius: full; --corner-shape: bevel"></i>`))).toBe(
      expectedBevel,
    );
  });

  it("a tier's full stays round while it applies", async () => {
    const expected = round();
    await atWidth(at("md"));
    expect(shape(mount(`<i style="${BOX} --radius: 2; --radius--md: full"></i>`))).toBe(expected);
  });

  it("--corner-shape wins over the token, on a plain element and on a primitive", () => {
    const expected = bevel();
    const root = mount(
      `<div><i data-plain style="${BOX} --radius: 2; --corner-shape: bevel"></i><button data-ui="button" style="--corner-shape: bevel">a</button></div>`,
    );
    expect(shape(root.querySelector("[data-plain]")!)).toBe(expected);
    expect(shape(root.querySelector("button")!)).toBe(expected);
  });

  it("--before-radius shapes the pseudo-element, and full keeps it round", () => {
    const pseudo = (radius: string) =>
      `<span style="--display: inline-block; --before-content: ''; --before-display: block; --before-w: 4; --before-h: 4; --before-radius: ${radius}"></span>`;
    expect(shape(mount(pseudo("2")), "::before")).toBe(token());
    expect(shape(mount(pseudo("full")), "::before")).toBe(round());
  });

  it("a --radius utility does not override a primitive's hook", () => {
    const el = mount(
      `<button data-ui="button" style="--radius: 2; --ui-button-corner-shape: bevel">a</button>`,
    );
    expect(shape(el)).toBe(bevel());
  });

  /** Each part with a radius: the fixture, and the selector of the part inside it. */
  const SHAPED: readonly (readonly [string, string, string?])[] = [
    ["badge", `<span data-ui="badge">a</span>`],
    ["button", `<button data-ui="button">a</button>`],
    ["button-group", `<div data-ui="button-group"></div>`],
    ["callout", `<div data-ui="callout"></div>`],
    ["card", `<div data-ui="card"></div>`],
    ["checkbox", `<input type="checkbox" />`],
    [
      "combobox",
      `<div data-ui="combobox"><div data-combobox-slot="control"></div></div>`,
      "[data-combobox-slot]",
    ],
    ["dialog", `<dialog data-ui="dialog"></dialog>`],
    ["field-group", `<div data-ui="field-group"></div>`],
    ["input", `<input data-ui="input" />`],
    ["input-group", `<div data-ui="input-group"></div>`],
    ["kbd", `<kbd>a</kbd>`],
    [
      "lightbox thumb",
      `<div data-ui="lightbox"><button data-lightbox-slot="thumb-content"></button></div>`,
      "[data-lightbox-slot]",
    ],
    ["otp cell", `<div data-ui="otp"><span data-otp-slot="cell"></span></div>`, "[data-otp-slot]"],
    ["password-group", `<div data-ui="password-group"></div>`],
    ["popover", `<div popover></div>`],
    ["select", `<select data-ui="select"></select>`],
    [
      "tabs track",
      `<div data-ui="tabs"><div data-tabs-slot="list"></div></div>`,
      "[data-tabs-slot]",
    ],
    [
      "tabs indicator",
      `<div data-ui="tabs"><div data-tabs-slot="indicator"></div></div>`,
      "[data-tabs-slot]",
    ],
    ["textarea", `<textarea data-ui="textarea"></textarea>`],
    [
      "toaster",
      `<div data-ui="toaster"><div data-toaster-slot="toast"></div></div>`,
      "[data-toaster-slot]",
    ],
    ["toggle", `<button data-ui="toggle">a</button>`],
    ["toggle-group", `<div data-ui="toggle-group"></div>`],
    [
      "tooltip",
      `<div data-ui="tooltip"><div data-tooltip-slot="content"></div></div>`,
      "[data-tooltip-slot]",
    ],
  ];

  /** Circles and pills: their hooks default to round. */
  const ROUND: readonly (readonly [string, string])[] = [
    ["meter", `<meter data-ui="meter"></meter>`],
    ["progress", `<progress data-ui="progress"></progress>`],
    ["radio", `<input data-ui="radio" type="radio" />`],
    ["slider", `<input type="range" />`],
    ["switch", `<input type="checkbox" role="switch" />`],
  ];

  const part = (html: string, selector?: string): Element => {
    const root = mount(html);
    return selector ? root.querySelector(selector)! : root;
  };

  it.each(SHAPED)("%s takes the token", (_name, html, selector) => {
    const expected = token();
    expect(shape(part(html!, selector))).toBe(expected);
  });

  it.each(ROUND)("%s stays round, with or without a --radius", (_name, html) => {
    const expected = round();
    expect(shape(mount(html))).toBe(expected);
    expect(shape(mount(html.replace(/ ?\/?>/, ` style="--radius: 3"$&`)))).toBe(expected);
  });

  it("a primitive hook overrides the token", () => {
    const expected = bevel();
    const el = mount(
      `<div style="--ui-card-corner-shape: bevel"><div data-ui="card"></div></div>`,
    ).firstElementChild!;
    expect(shape(el)).toBe(expected);
  });

  it("an inset button follows the field shape, and a menu button its hook", () => {
    const expected = bevel();
    const root = mount(`<div>
      <div data-ui="input-group" style="--ui-field-corner-shape: bevel"><button data-ui="button">a</button></div>
      <div data-ui="menu" style="--ui-menu-button-corner-shape: bevel"><div data-menu-slot="popover"><button data-ui="button">a</button></div></div>
    </div>`);
    for (const button of root.querySelectorAll("button")) expect(shape(button)).toBe(expected);
  });

  it("--corner-shape reaches a round primitive too", () => {
    const expected = bevel();
    expect(
      shape(mount(`<input data-ui="radio" type="radio" style="--corner-shape: bevel" />`)),
    ).toBe(expected);
  });
});
