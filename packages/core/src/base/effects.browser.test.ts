"use strict";

/**
 * @fileoverview `--opacity`: state tiers apply in the
 * documented precedence, and a modifier on a parent never reaches a child.
 */

import { describe, expect, it } from "vite-plus/test";
import { commands, server, userEvent } from "vite-plus/test/browser/context";
import { mount, style, useKit } from "../../test/browser.ts";

const held = commands as unknown as {
  mouseDown(): Promise<void>;
  mouseUp(): Promise<void>;
  emulateTouch(enabled: boolean): Promise<void>;
};
const BOX = "inline-size: 100px; block-size: 40px; background: gray;";

describe("--opacity states", () => {
  useKit();

  it("active beats hover: .9 at rest, .8 hovered, .6 pressed while hovered", async () => {
    const el = mount(
      `<button style="${BOX} --opacity: .9; --opacity--hover: .8; --opacity--active: .6">x</button>`,
    );
    expect(style(el, "opacity")).toBe("0.9");
    await userEvent.hover(el);
    expect(style(el, "opacity")).toBe("0.8");
    await held.mouseDown();
    expect(style(el, "opacity")).toBe("0.6");
    await held.mouseUp();
    expect(style(el, "opacity")).toBe("0.8");
    await userEvent.unhover(el);
    expect(style(el, "opacity")).toBe("0.9");
  });

  it("a parent's --opacity--hover never reaches a child's chain", async () => {
    const root = mount(
      `<div style="${BOX} --opacity--hover: .5">
        <div data-child style="${BOX} --opacity: .9; --w--hover: 1px"></div>
      </div>`,
    );
    const child = root.querySelector("[data-child]")!;
    await userEvent.hover(child);
    expect(style(child, "opacity")).toBe("0.9");
    await userEvent.unhover(child);
  });

  it("an own hover tier beats the group hover tier", async () => {
    const root = mount(
      `<div data-ui="group" style="${BOX}">
        <div data-own style="${BOX} --opacity: .9; --opacity--hover: .8; --group-opacity--hover: .3"></div>
        <div data-group style="${BOX} --opacity: .9; --group-opacity--hover: .3"></div>
      </div>`,
    );
    const own = root.querySelector("[data-own]")!;
    const group = root.querySelector("[data-group]")!;
    await userEvent.hover(group);
    expect(style(group, "opacity")).toBe("0.3");
    expect(style(own, "opacity")).toBe("0.3");
    await userEvent.hover(own);
    expect(style(own, "opacity")).toBe("0.8");
    await userEvent.unhover(own);
  });

  // Touch emulation is a CDP session: Chromium only.
  it.skipIf(server.browser !== "chromium")(
    "a hover tier is inert when the primary pointer cannot hover",
    async () => {
      const el = mount(`<button style="${BOX} --opacity: .9; --opacity--hover: .5">x</button>`);
      await held.emulateTouch(true);
      try {
        expect(matchMedia("(hover: hover)").matches).toBe(false);
        await userEvent.hover(el);
        expect(style(el, "opacity")).toBe("0.9");
      } finally {
        await held.emulateTouch(false);
        await userEvent.unhover(el);
      }
      expect(matchMedia("(hover: hover)").matches).toBe(true);
    },
  );
});

describe("no-base state tiers", () => {
  useKit();

  it("--opacity--hover: .4 alone is 1 at rest and .4 hovered", async () => {
    const el = mount(`<div style="${BOX} --opacity--hover: .4">x</div>`);
    expect(style(el, "opacity")).toBe("1");
    await userEvent.hover(el);
    expect(style(el, "opacity")).toBe("0.4");
    await userEvent.unhover(el);
  });

  it("--scale--hover: 1.5 alone is none at rest and 1.5 hovered", async () => {
    const el = mount(`<div style="${BOX} --scale--hover: 1.5">x</div>`);
    expect(style(el, "scale")).toBe("none");
    await userEvent.hover(el);
    expect(style(el, "scale")).toBe("1.5");
    await userEvent.unhover(el);
  });

  it("--shadow--hover alone composes into box-shadow only while hovered", async () => {
    const el = mount(`<div style="${BOX} --shadow--hover: 0 0 0 2px rgb(1, 2, 3)">x</div>`);
    expect(style(el, "box-shadow")).not.toContain("rgb(1, 2, 3)");
    await userEvent.hover(el);
    expect(style(el, "box-shadow")).toContain("rgb(1, 2, 3) 0px 0px 0px 2px");
    await userEvent.unhover(el);
  });

  it("a primitive keeps its own chain: --opacity--hover alone on a button does nothing", async () => {
    const el = mount(`<button data-ui="button" style="--opacity--hover: .4">x</button>`);
    await userEvent.hover(el);
    expect(style(el, "opacity")).toBe("1");
    await userEvent.unhover(el);
  });
});
