"use strict";

/**
 * @fileoverview `--space-x` / `--space-y`: a margin between a container's direct
 * children, set on the container. Scale numbers and lengths, state and
 * breakpoint tiers, a child's own margin utility, and nested containers on the
 * same axis.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { at, atWidth, below, mount, scale, style, useKit } from "../../test/browser.ts";

const px = (value: string) => Number.parseFloat(value);
const margins = (root: Element, property: string) =>
  [...root.children].map((child) => px(style(child, property)));

describe("--space-x and --space-y", () => {
  useKit();

  it("--space-y: 4 puts 4 steps after every child but the last", () => {
    const root = mount(`<div style="--space-y: 4"><p>a</p><p>b</p><p>c</p></div>`);
    const [a, b, c] = margins(root, "margin-block-end");
    expect(a).toBeCloseTo(scale(4), 1);
    expect(b).toBeCloseTo(scale(4), 1);
    expect(c).toBe(0);
  });

  it("--space-x takes a length, on the inline end, and leaves the container alone", () => {
    const root = mount(
      `<div style="--display: flex; --space-x: 12px"><span>a</span><span>b</span></div>`,
    );
    expect(margins(root, "margin-inline-end")).toEqual([12, 0]);
    expect(px(style(root, "margin-inline-end"))).toBe(0);
  });

  it("reaches direct children only", () => {
    const root = mount(`<div style="--space-y: 4"><div><p>a</p><p>b</p></div><p>c</p></div>`);
    const nested = root.firstElementChild!;
    expect(px(style(nested, "margin-block-end"))).toBeCloseTo(scale(4), 1);
    expect(margins(nested, "margin-block-end")).toEqual([0, 0]);
  });

  it("a nested container on the same axis keeps its parent's gap and sets its own", () => {
    const root = mount(`<div style="--space-y: 8">
      <div style="--space-y: 2"><p>a</p><p>b</p><div style="--space-y: 1"><i>x</i><i>y</i></div></div>
      <p>c</p>
    </div>`);
    const inner = root.firstElementChild!;
    const innermost = inner.lastElementChild!;
    expect(px(style(inner, "margin-block-end"))).toBeCloseTo(scale(8), 1);
    expect(margins(inner, "margin-block-end")[0]).toBeCloseTo(scale(2), 1);
    expect(px(style(innermost.firstElementChild!, "margin-block-end"))).toBeCloseTo(scale(1), 1);
    expect(px(style(innermost, "margin-block-end"))).toBe(0);
  });

  it("a child's own margin utility wins", () => {
    const root = mount(`<div style="--space-y: 4"><p style="--mb: 1">a</p><p>b</p></div>`);
    expect(px(style(root.firstElementChild!, "margin-block-end"))).toBeCloseTo(scale(1), 1);
  });

  it("the --m and --my shorthands on a child win too", () => {
    const root = mount(`<div style="--space-y: 4">
      <p style="--m: 1">a</p><p style="--my: 2">b</p><p>c</p>
    </div>`);
    const [a, b] = margins(root, "margin-block-end");
    expect(a).toBeCloseTo(scale(1), 1);
    expect(b).toBeCloseTo(scale(2), 1);
  });

  it("x and y work together, and on a child that spaces the other axis", () => {
    const root = mount(`<div style="--space-x: 2; --space-y: 4">
      <div style="--display: flex; --space-x: 1"><i>a</i><i>b</i></div><p>c</p>
    </div>`);
    const row = root.firstElementChild!;
    expect(px(style(row, "margin-block-end"))).toBeCloseTo(scale(4), 1);
    expect(px(style(row, "margin-inline-end"))).toBeCloseTo(scale(2), 1);
    expect(margins(row, "margin-inline-end")[0]).toBeCloseTo(scale(1), 1);
  });

  it("leaves a dialog or popover child its own margins", () => {
    const root = mount(`<div style="--space-y: 4">
      <dialog data-ui="dialog">d</dialog><div popover>p</div><p>c</p>
    </div>`);
    const [dialog, popover] = [...root.children];
    expect(style(dialog!, "margin-block-end")).not.toBe(`${scale(4)}px`);
    expect(px(style(popover!, "margin-block-end"))).not.toBeCloseTo(scale(4), 1);
  });

  it("takes breakpoint tiers", async () => {
    const root = mount(`<div style="--space-y: 1; --space-y--md: 6"><p>a</p><p>b</p></div>`);
    await atWidth(below("md"));
    expect(margins(root, "margin-block-end")[0]).toBeCloseTo(scale(1), 1);
    await atWidth(at("md"));
    expect(margins(root, "margin-block-end")[0]).toBeCloseTo(scale(6), 1);
  });

  it("takes state tiers on the container, and the group form", async () => {
    const root = mount(`<div data-ui="group" style="inline-size: 200px">
      <div data-own style="--space-x: 1; --space-x--hover: 3; --display: flex"><i>a</i><i>b</i></div>
      <div data-member style="--space-x: 1; --group-space-x--hover: 5; --display: flex"><i>a</i><i>b</i></div>
    </div>`);
    const own = root.querySelector("[data-own]")!;
    const member = root.querySelector("[data-member]")!;
    expect(margins(own, "margin-inline-end")[0]).toBeCloseTo(scale(1), 1);
    await userEvent.hover(member);
    expect(margins(member, "margin-inline-end")[0]).toBeCloseTo(scale(5), 1);
    await userEvent.hover(own);
    expect(margins(own, "margin-inline-end")[0]).toBeCloseTo(scale(3), 1);
    await userEvent.unhover(root);
    expect(margins(own, "margin-inline-end")[0]).toBeCloseTo(scale(1), 1);
  });
});
