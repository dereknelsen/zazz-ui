"use strict";

/**
 * @fileoverview `--text-wrap`: `truncate` ends overflowing text on one line with
 * an ellipsis; `none` is plain wrapping; any tier, breakpoint or state, can turn
 * truncation on or off, because one resolved value drives all three properties.
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

  it("truncates inside a primitive that clips, keeping its clip", async () => {
    const el = mount(`<div data-ui="card" style="${SIZED} --text-wrap: truncate">${TEXT}</div>`);
    expect(style(el, "text-wrap-mode")).toBe("nowrap");
    expect(style(el, "overflow-x")).toBe("clip");
    expect(style(el, "text-overflow")).toBe("ellipsis");
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
});
