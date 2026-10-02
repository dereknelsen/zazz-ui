"use strict";

/**
 * @fileoverview Button: the primitive
 * chain (utility, variant, inline hook, subtree hook, root hook), a variant
 * staying on its element while a hook reaches a nested button, a utility
 * flattening a state the hook keeps, and the focus ring surviving `--shadow`.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import {
  atWidth,
  lengthPx,
  mount,
  scale,
  style,
  tabTo,
  useCss,
  useKit,
} from "../../../test/browser.ts";

const paddingInline = (el: Element) => Number.parseFloat(style(el, "padding-inline-start"));
const background = (el: Element) => style(el, "background-color");

describe("button chain (claim 10)", () => {
  useKit();
  useCss(`
    :root { --ui-button-px: 5; }
    .sidebar { --ui-button-px: 2; }
    .from-sheet { --px: 4; }
  `);

  it("honors an inline utility, a variant, an inline hook, a subtree hook, then the root hook", async () => {
    await atWidth(1024);
    const root = mount(`<div>
      <button data-ui="button" data-utility style="--px: 4">a</button>
      <button data-ui="button" data-utility-over-variant data-button-variant="link" style="--px: 4">b</button>
      <button data-ui="button" data-variant-over-hook data-button-variant="link" style="--ui-button-px: 3">c</button>
      <div class="sidebar">
        <button data-ui="button" data-inline-hook style="--ui-button-px: 3">d</button>
        <button data-ui="button" data-subtree-hook>e</button>
      </div>
      <button data-ui="button" data-root-hook>f</button>
      <button data-ui="button" data-sheet-utility class="from-sheet">g</button>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(paddingInline(at("[data-utility]"))).toBeCloseTo(scale(4), 1);
    expect(paddingInline(at("[data-utility-over-variant]"))).toBeCloseTo(scale(4), 1);
    expect(paddingInline(at("[data-variant-over-hook]"))).toBe(0);
    expect(paddingInline(at("[data-inline-hook]"))).toBeCloseTo(scale(3), 1);
    expect(paddingInline(at("[data-subtree-hook]"))).toBeCloseTo(scale(2), 1);
    expect(paddingInline(at("[data-root-hook]"))).toBeCloseTo(scale(5), 1);
    expect(paddingInline(at("[data-sheet-utility]"))).toBeCloseTo(scale(5), 1);
  });

  it("--px--md: 6 alone applies at md and the hook applies below", async () => {
    const el = mount(`<button data-ui="button" style="--px--md: 6">x</button>`);
    await atWidth(1024);
    expect(paddingInline(el)).toBeCloseTo(scale(6), 1);
    await atWidth(600);
    expect(paddingInline(el)).toBeCloseTo(scale(5), 1);
    await atWidth(1024);
  });
});

describe("button variants, hooks, and states (claims 26, 27, 28)", () => {
  useKit();
  useCss(`[data-ui~="button"] { transition: none; }`);

  it("a variant stays on its element; an inline hook reaches a nested button", () => {
    const root = mount(`<div>
      <div data-ui="button" data-reference>r</div>
      <div data-ui="button" data-button-variant="primary" data-outer>
        <div data-ui="button" data-inner>i</div>
      </div>
      <div data-ui="button" style="--ui-button-bg: rgb(255, 0, 0)">
        <div data-ui="button" data-hooked>h</div>
      </div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(background(at("[data-outer]"))).not.toBe(background(at("[data-reference]")));
    expect(background(at("[data-inner]"))).toBe(background(at("[data-reference]")));
    expect(background(at("[data-hooked]"))).toBe("rgb(255, 0, 0)");
  });

  it("an inline --bg flattens hover; an inline --ui-button-bg keeps it", async () => {
    const root = mount(`<div>
      <button data-ui="button" data-reference>r</button>
      <button data-ui="button" data-utility style="--bg: rgb(1, 2, 3)">p</button>
      <button data-ui="button" data-hook style="--ui-button-bg: rgb(1, 2, 3)">h</button>
    </div>`);
    const utility = root.querySelector("[data-utility]")!;
    const hook = root.querySelector("[data-hook]")!;
    const rest = background(utility);
    expect(rest).not.toBe(background(root.querySelector("[data-reference]")!));
    await userEvent.hover(utility);
    expect(background(utility)).toBe(rest);
    await userEvent.unhover(utility);
    expect(background(hook)).toBe("rgb(1, 2, 3)");
    await userEvent.hover(hook);
    expect(background(hook)).not.toBe("rgb(1, 2, 3)");
    await userEvent.unhover(hook);
  });

  it("the focus ring survives a --shadow utility", async () => {
    const el = mount(
      `<button data-ui="button" style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)">x</button>`,
    );
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
    expect(style(el, "box-shadow")).not.toContain(ring);
    await tabTo(el);
    expect(document.activeElement).toBe(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
  });

  it("the focus ring survives a --ring utility", async () => {
    const el = mount(`<button data-ui="button" style="--ring: 2px">x</button>`);
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    expect(style(el, "box-shadow")).toContain("0px 0px 0px 2px");
    expect(style(el, "box-shadow")).not.toContain(ring);
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 0px 0px 2px");
  });

  it("icon-sm shrinks the icon through the inheriting icon-size hook", () => {
    const root = mount(`<div>
      <button data-ui="button" data-button-size="icon"><svg></svg></button>
      <button data-ui="button" data-button-size="icon-sm"><svg></svg></button>
    </div>`);
    const [icon, iconSm] = [...root.querySelectorAll("svg")];
    expect(Number.parseFloat(style(iconSm!, "inline-size"))).toBeLessThan(
      Number.parseFloat(style(icon!, "inline-size")),
    );
  });

  it("a disabled primary button keeps the primary color", () => {
    const root = mount(`<div>
      <button data-ui="button" data-button-variant="primary" data-enabled>a</button>
      <button data-ui="button" data-button-variant="primary" data-disabled disabled>b</button>
    </div>`);
    expect(background(root.querySelector("[data-disabled]")!)).toBe(
      background(root.querySelector("[data-enabled]")!),
    );
  });
});
