"use strict";

/**
 * @fileoverview `--text-wrap`: `truncate` ends overflowing text on one line with
 * an ellipsis; `none` is plain wrapping; any tier, breakpoint or state, can turn
 * truncation on or off. It beats a primitive's overflow and loses to `--overflow`.
 */

import { userEvent } from "vite-plus/test/browser";
import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

const SIZED = "display: block; inline-size: 40px;";
const TEXT = "long enough to overflow its box";

describe("--text-wrap", () => {
  useKit();

  it("truncate cuts one line with an ellipsis", () => {
    const el = mount(`<div style="${SIZED} --text-wrap: truncate">${TEXT}</div>`);
    expect(style(el, "text-wrap-mode")).toBe("nowrap");
    expect(style(el, "overflow-x")).toBe("hidden");
    expect(style(el, "text-overflow")).toBe("ellipsis");
    expect(el.scrollWidth).toBeGreaterThan(el.clientWidth);
  });

  it("a plain value wraps and clips nothing", () => {
    const el = mount(`<div style="${SIZED} --text-wrap: balance">${TEXT}</div>`);
    expect(style(el, "text-wrap-style")).toBe("balance");
    expect(style(el, "overflow-x")).toBe("visible");
  });

  it("truncates at a breakpoint and stops at a higher one", async () => {
    const el = mount(
      `<div style="${SIZED} --text-wrap--md: truncate; --text-wrap--lg: none">${TEXT}</div>`,
    );
    await atWidth(below("md"));
    expect(style(el, "text-wrap-mode")).toBe("wrap");
    expect(style(el, "overflow-x")).toBe("visible");
    await atWidth(at("md"));
    expect(style(el, "text-wrap-mode")).toBe("nowrap");
    expect(style(el, "overflow-x")).toBe("hidden");
    await atWidth(at("lg"));
    expect(style(el, "text-wrap-mode")).toBe("wrap");
    expect(style(el, "overflow-x")).toBe("visible");
  });

  it("none at a tier ends truncation", async () => {
    const el = mount(
      `<div style="${SIZED} --text-wrap: truncate; --text-wrap--md: none">${TEXT}</div>`,
    );
    await atWidth(at("md"));
    expect(style(el, "text-wrap-mode")).toBe("wrap");
    expect(style(el, "overflow-x")).toBe("visible");
  });

  it("a state ends truncation, and leaving it restores it", async () => {
    const el = mount(
      `<div style="${SIZED} --text-wrap: truncate; --text-wrap--hover: pretty">${TEXT}</div>`,
    );
    expect(style(el, "overflow-x")).toBe("hidden");
    await userEvent.hover(el);
    expect(style(el, "text-wrap-mode")).toBe("wrap");
    expect(style(el, "overflow-x")).toBe("visible");
    await userEvent.unhover(el);
    expect(style(el, "overflow-x")).toBe("hidden");
  });

  it("a state starts truncation", async () => {
    const el = mount(
      `<div style="${SIZED} block-size: 80px; --text-wrap: wrap; --text-wrap--hover: truncate">${TEXT}</div>`,
    );
    expect(style(el, "overflow-x")).toBe("visible");
    await userEvent.hover(el);
    expect(style(el, "overflow-x")).toBe("hidden");
    await userEvent.unhover(el);
  });

  it("--overflow beats truncate's clip", () => {
    const el = mount(`<div style="${SIZED} --text-wrap: truncate; --overflow: auto">${TEXT}</div>`);
    expect(style(el, "overflow-x")).toBe("auto");
    expect(style(el, "text-overflow")).toBe("ellipsis");
  });

  it("passes auto through", () => {
    const el = mount(`<div style="${SIZED} --text-wrap: auto">${TEXT}</div>`);
    expect(style(el, "text-wrap-mode")).toBe("wrap");
    expect(style(el, "text-wrap-style")).toBe("auto");
  });

  it("a primitive keeps its own overflow", async () => {
    const root = mount(`<div>
      <div data-ui="card" data-control></div>
      <div data-ui="card" data-tier style="--text-wrap--md: truncate"></div>
      <div data-ui="card" data-word style="--text-wrap: balance; --animation: truncate-in 1s"></div>
    </div>`);
    const overflow = (selector: string) => style(root.querySelector(selector)!, "overflow-x");
    await atWidth(below("md"));
    expect(overflow("[data-control]")).toBe("clip");
    expect(overflow("[data-tier]")).toBe("clip");
    expect(overflow("[data-word]")).toBe("clip");
  });

  it("truncate beats a primitive's overflow, and ending it hands that back", async () => {
    const root = mount(`<div>
      <div data-ui="card" data-base style="${SIZED} --text-wrap: truncate">${TEXT}</div>
      <div data-ui="card" data-ended style="${SIZED} --text-wrap: truncate; --text-wrap--md: none">${TEXT}</div>
    </div>`);
    const base = root.querySelector("[data-base]")!;
    const ended = root.querySelector("[data-ended]")!;
    await atWidth(below("md"));
    expect(style(base, "overflow-x")).toBe("hidden");
    expect(style(base, "text-overflow")).toBe("ellipsis");
    expect(style(ended, "overflow-x")).toBe("hidden");
    await atWidth(at("md"));
    expect(style(ended, "overflow-x")).toBe("clip");
    expect(style(ended, "text-overflow")).toBe("clip");
    expect(style(ended, "text-wrap-mode")).toBe("wrap");
  });

  it("a state ending truncation hands a primitive its overflow back", async () => {
    const el = mount(
      `<div data-ui="card" style="${SIZED} block-size: 80px; --text-wrap: truncate; --text-wrap--hover: pretty">${TEXT}</div>`,
    );
    expect(style(el, "overflow-x")).toBe("hidden");
    await userEvent.hover(el);
    expect(style(el, "overflow-x")).toBe("clip");
    expect(style(el, "text-wrap-mode")).toBe("wrap");
    await userEvent.unhover(el);
  });

  it("a state beats a breakpoint, and the highest active tier wins", async () => {
    const el = mount(
      `<div style="${SIZED} block-size: 80px; --text-wrap--md: none; --text-wrap--hover: truncate">${TEXT}</div>`,
    );
    await atWidth(at("md"));
    expect(style(el, "overflow-x")).toBe("visible");
    await userEvent.hover(el);
    expect(style(el, "overflow-x")).toBe("hidden");
    await userEvent.unhover(el);
  });

  it("a group state ends truncation too", () => {
    const root = mount(
      `<ui-group role="group" aria-disabled="true"><div data-child style="${SIZED} --text-wrap: truncate; --group-text-wrap--disabled: none">${TEXT}</div></ui-group>`,
    );
    const child = root.querySelector("[data-child]")!;
    expect(style(child, "overflow-x")).toBe("visible");
    expect(style(child, "text-wrap-mode")).toBe("wrap");
  });

  it("the group form truncates too", () => {
    const root = mount(
      `<ui-group role="group" aria-disabled="true"><div data-child style="${SIZED} --group-text-wrap--disabled: truncate">${TEXT}</div></ui-group>`,
    );
    const child = root.querySelector("[data-child]")!;
    expect(style(child, "text-wrap-mode")).toBe("nowrap");
    expect(style(child, "overflow-x")).toBe("hidden");
    expect(style(child, "text-overflow")).toBe("ellipsis");
  });

  it("of two active states, the higher one wins, either way round", () => {
    const root = mount(`<div>
      <a data-a aria-current="page" aria-expanded="true" style="${SIZED} --text-wrap--open: truncate; --text-wrap--current: none">${TEXT}</a>
      <a data-b aria-current="page" aria-expanded="true" style="${SIZED} --text-wrap--open: none; --text-wrap--current: truncate">${TEXT}</a>
    </div>`);
    expect(style(root.querySelector("[data-a]")!, "overflow-x")).toBe("visible");
    expect(style(root.querySelector("[data-a]")!, "text-wrap-mode")).toBe("wrap");
    expect(style(root.querySelector("[data-b]")!, "overflow-x")).toBe("hidden");
    expect(style(root.querySelector("[data-b]")!, "text-wrap-mode")).toBe("nowrap");
  });

  it("an own state beats a group state, either way round", () => {
    const root = mount(`<ui-group role="group" aria-disabled="true">
      <a data-a aria-current="page" style="${SIZED} --group-text-wrap--disabled: truncate; --text-wrap--current: none">${TEXT}</a>
      <a data-b aria-current="page" style="${SIZED} --group-text-wrap--disabled: none; --text-wrap--current: truncate">${TEXT}</a>
    </ui-group>`);
    expect(style(root.querySelector("[data-a]")!, "overflow-x")).toBe("visible");
    expect(style(root.querySelector("[data-b]")!, "overflow-x")).toBe("hidden");
  });

  it("a state ends a breakpoint's truncation", async () => {
    const el = mount(
      `<div style="${SIZED} block-size: 80px; --text-wrap--md: truncate; --text-wrap--hover: pretty">${TEXT}</div>`,
    );
    await atWidth(at("md"));
    expect(style(el, "overflow-x")).toBe("hidden");
    await userEvent.hover(el);
    expect(style(el, "overflow-x")).toBe("visible");
    await userEvent.unhover(el);
  });

  it("ending truncation leaves --line-clamp's clip alone", async () => {
    const el = mount(
      `<div style="${SIZED} --text-wrap: truncate; --text-wrap--md: none; --line-clamp: 2">${TEXT}</div>`,
    );
    await atWidth(at("md"));
    expect(style(el, "overflow-x")).toBe("hidden");
  });

  it("a heading keeps its own wrap unless it truncates", async () => {
    const root = mount(`<div>
      <h1 data-tier style="--text-wrap--md: pretty">x</h1>
      <h1 data-cut style="${SIZED} --text-wrap: truncate">${TEXT}</h1>
    </div>`);
    await atWidth(at("md"));
    expect(style(root.querySelector("[data-tier]")!, "text-wrap-style")).toBe("balance");
    expect(style(root.querySelector("[data-cut]")!, "text-wrap-mode")).toBe("nowrap");
  });
});
