"use strict";

/**
 * @fileoverview `--opacity`: state tiers apply in the
 * documented precedence, and a modifier on a parent never reaches a child.
 * Signed rings (`--ring`, `--focus-ring`) and the shadow's cast angle.
 */

import { describe, expect, it } from "vite-plus/test";
import { commands, server, userEvent } from "vite-plus/test/browser/context";
import { at, atWidth, below, mount, settled, style, tabTo, useKit } from "../../test/browser.ts";

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

  it("--opacity--hover alone works on roles, switches, and prose (only primitives need a base)", async () => {
    for (const token of ["text-2xl", "group", "prose", "group text-sm"]) {
      const el = mount(`<a href="#" data-ui="${token}" style="${BOX} --opacity--hover: .8">x</a>`);
      expect(style(el, "opacity"), token).toBe("1");
      await userEvent.hover(el);
      expect(style(el, "opacity"), token).toBe("0.8");
      await userEvent.unhover(el);
    }
  });

  it("--opacity--hover alone works on a button, which sets opacity only when disabled", async () => {
    const root = mount(`<div>
      <button data-ui="button" data-tier style="--transition: none; --opacity--hover: .4">x</button>
      <button data-ui="button" data-ref disabled>x</button>
      <button data-ui="button" data-disabled disabled style="--opacity--md: .4">x</button>
    </div>`);
    const el = root.querySelector<HTMLElement>("[data-tier]")!;
    expect(style(el, "opacity")).toBe("1");
    await userEvent.hover(el);
    expect(style(el, "opacity")).toBe("0.4");
    await userEvent.unhover(el);
    // the button's disabled opacity is in a layer above the tier-only rule
    expect(style(root.querySelector("[data-disabled]")!, "opacity")).toBe(
      style(root.querySelector("[data-ref]")!, "opacity"),
    );
  });
});

describe("shadow keywords and hue", () => {
  useKit();

  /** box-shadow of a probe whose own style is `css`, measured beside the element. */
  const probe = (css: string) => {
    const el = document.createElement("div");
    el.style.cssText = css;
    document.body.append(el);
    const value = style(el, "box-shadow");
    el.remove();
    return value;
  };

  it("--shadow: md reads as var(--shadow-md), at the base and on hover", async () => {
    const root = mount(`<div>
      <div data-kw style="--shadow: md; --shadow--hover: xl">x</div>
      <div data-var style="--shadow: var(--shadow-md)">x</div>
    </div>`);
    const kw = root.querySelector("[data-kw]")!;
    expect(style(kw, "box-shadow")).toBe(style(root.querySelector("[data-var]")!, "box-shadow"));
    await userEvent.hover(kw);
    // the composite leads with the (empty) ring layers, then the shadow
    expect(style(kw, "box-shadow").endsWith(probe("box-shadow: var(--shadow-xl)"))).toBe(true);
    await userEvent.unhover(kw);
  });

  it("custom values and variables still pass through", () => {
    const el = mount(`<div style="--shadow: 0 0 0 3px rgb(1, 2, 3)">x</div>`);
    expect(style(el, "box-shadow")).toContain("rgb(1, 2, 3) 0px 0px 0px 3px");
  });

  it("--shadow-hue tints keyword, var(), and primitive shadows on the element and its subtree", () => {
    const root = mount(`<div style="--shadow-hue: rgb(255, 0, 0)">
      <div data-kw style="--shadow: sm">x</div>
      <div data-var style="--shadow: var(--shadow-sm)">x</div>
      <div data-pop style="box-shadow: var(--shadow-md)">x</div>
    </div>`);
    const red = probe("box-shadow: 0 0 1px 0 oklch(from rgb(255, 0, 0) l c h / 0.05)").match(
      /oklch\([^)]*\)/,
    )?.[0];
    for (const selector of ["[data-kw]", "[data-var]", "[data-pop]"]) {
      expect(style(root.querySelector(selector)!, "box-shadow"), selector).not.toBe(
        probe("box-shadow: var(--shadow-sm)"),
      );
    }
    expect(style(root.querySelector("[data-kw]")!, "box-shadow")).toContain(red!.split(" / ")[0]);
  });

  it("--color-shadow re-tints every shadow from the theme", () => {
    const el = mount(`<div style="--shadow: xs">x</div>`);
    const before = style(el, "box-shadow");
    document.documentElement.style.setProperty("--color-shadow", "rgb(0, 0, 255)");
    const after = style(el, "box-shadow");
    document.documentElement.style.removeProperty("--color-shadow");
    expect(after).not.toBe(before);
  });
});

describe("signed rings", () => {
  useKit();

  const COLOR = "--ring-color: rgb(1, 2, 3)";
  /** The ring band's layer: `rgb(1, 2, 3) 0px 0px 0px <spread>px[ inset]`. */
  const band = (el: Element, inset: boolean) =>
    style(el, "box-shadow")
      .split(/,\s*(?=rgb)/)
      .find((layer) => layer.startsWith("rgb(1, 2, 3)") && layer.endsWith("inset") === inset);

  it("a number is pixels, outset", () => {
    const el = mount(`<div style="--ring: 2; ${COLOR}">x</div>`);
    expect(band(el, false)).toBe("rgb(1, 2, 3) 0px 0px 0px 2px");
    expect(band(el, true)).toBe("rgb(1, 2, 3) 0px 0px 0px 0px inset");
  });

  it("a negative ring is inset, as a number or a length", () => {
    for (const ring of ["-2", "-2px"]) {
      const el = mount(`<div style="--ring: ${ring}; ${COLOR}">x</div>`);
      expect(band(el, true), ring).toBe("rgb(1, 2, 3) 0px 0px 0px 2px inset");
      expect(band(el, false), ring).toBe("rgb(1, 2, 3) 0px 0px 0px 0px");
    }
  });

  it("the offset widens the band on either side", () => {
    const el = mount(`<div style="--ring: -2; --ring-offset: 3; ${COLOR}">x</div>`);
    expect(band(el, true)).toBe("rgb(1, 2, 3) 0px 0px 0px 5px inset");
  });

  it("a breakpoint tier flips the ring inset", async () => {
    const el = mount(`<div style="--ring: 2; --ring--md: -2; ${COLOR}">x</div>`);
    await atWidth(below("md"));
    expect(band(el, false)).toBe("rgb(1, 2, 3) 0px 0px 0px 2px");
    await atWidth(at("md"));
    expect(band(el, true)).toBe("rgb(1, 2, 3) 0px 0px 0px 2px inset");
  });

  it("--focus-ring: -2 draws a button's focus ring inside, with the outline twin", async () => {
    const el = mount(`<button data-ui="button" style="--focus-ring: -2">x</button>`);
    await tabTo(el);
    await settled(el);
    expect(style(el, "box-shadow")).toMatch(/0px 0px 0px 2px inset/);
    expect(style(el, "outline-width")).toBe("2px");
    expect(Number.parseFloat(style(el, "outline-offset"))).toBeLessThanOrEqual(-2);
  });

  it("a --focus-ring tier alone keeps the default ring below it", async () => {
    const el = mount(`<button data-ui="button" style="--focus-ring--md: -2">x</button>`);
    await atWidth(below("md"));
    await tabTo(el);
    await settled(el);
    expect(style(el, "box-shadow")).not.toMatch(/[1-9][\d.]*px inset/);
    expect(style(el, "outline-width")).toBe(style(document.documentElement, "--ring-width"));
  });

  it("--focus-ring sets a plain element's focus outline", async () => {
    const el = mount(`<a href="#x" style="--focus-ring: -3">x</a>`);
    await tabTo(el);
    expect(style(el, "outline-width")).toBe("3px");
    expect(Number.parseFloat(style(el, "outline-offset"))).toBeLessThanOrEqual(-3);
  });
});

describe("shadow angle", () => {
  useKit();

  /** The [x, y] offsets of a shadow's first layer, in px. */
  const offsets = (el: Element) => {
    const [, x, y] = /\) (-?[\d.e-]+)px (-?[\d.e-]+)px/.exec(style(el, "box-shadow"))!;
    return [Number(x), Number(y)];
  };

  it("casts down by default, up at 180deg and left at 90deg", () => {
    const root = mount(`<div>
      <div data-down style="box-shadow: var(--shadow-xs)">x</div>
      <div data-up style="box-shadow: var(--shadow-xs); --shadow-angle: 180deg">x</div>
      <div data-left style="box-shadow: var(--shadow-xs); --shadow-angle: 90deg">x</div>
    </div>`);
    const [dx, dy] = offsets(root.querySelector("[data-down]")!);
    expect([dx, dy]).toEqual([0, 8]);
    const [ux, uy] = offsets(root.querySelector("[data-up]")!);
    expect([Math.round(ux!), uy]).toEqual([0, -8]);
    const [lx, ly] = offsets(root.querySelector("[data-left]")!);
    expect([lx, Math.round(ly!)]).toEqual([-8, 0]);
  });

  it("follows a breakpoint tier, and reaches the subtree's token shadows", async () => {
    const root = mount(`<div style="--shadow-angle--md: 180deg">
      <div data-child style="box-shadow: var(--shadow-xs)">x</div>
    </div>`);
    const child = root.querySelector("[data-child]")!;
    await atWidth(below("md"));
    expect(offsets(child)[1]).toBe(8);
    await atWidth(at("md"));
    expect(offsets(child)[1]).toBe(-8);
  });
});
