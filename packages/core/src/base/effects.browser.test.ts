"use strict";

/**
 * @fileoverview `--opacity`: state tiers apply in the
 * documented precedence, and a modifier on a parent never reaches a child.
 * Signed rings (`--ring`, `--focus-ring`) and the shadow's cast angle.
 * `--filter`, `--backdrop-filter`, and `--mix-blend`.
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

describe("shadow tokens and tint", () => {
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
  /** The layers of a computed box-shadow (each starts with its color). */
  const layers = (value: string) => value.match(/(?:oklch|rgba?|color)\(/g)?.length ?? 0;
  /** The y offset of a shadow's last (farthest) layer, in px. */
  const farY = (value: string) => Number(/(-?[\d.e-]+)px [\d.e-]+px 0px$/.exec(value)?.[1]);

  it("each token is the four-layer elevation shadow, deeper as the size grows", () => {
    expect(layers(probe("box-shadow: var(--shadow-md)"))).toBe(4);
    const sizes = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];
    const depths = sizes.map((size) => farY(probe(`box-shadow: var(--shadow-${size})`)));
    for (let i = 1; i < depths.length; i++) expect(depths[i]!).toBeGreaterThan(depths[i - 1]!);
  });

  it("--shadow takes a token or a custom value; a size word is no longer a shorthand", () => {
    const root = mount(`<div>
      <div data-var style="--shadow: var(--shadow-md)">x</div>
      <div data-raw style="--shadow: 0 0 0 3px rgb(1, 2, 3)">x</div>
      <div data-word style="--shadow: md">x</div>
    </div>`);
    expect(
      style(root.querySelector("[data-var]")!, "box-shadow").endsWith(
        probe("box-shadow: var(--shadow-md)"),
      ),
    ).toBe(true);
    expect(style(root.querySelector("[data-raw]")!, "box-shadow")).toContain(
      "rgb(1, 2, 3) 0px 0px 0px 3px",
    );
    expect(style(root.querySelector("[data-word]")!, "box-shadow")).toBe("none");
  });

  it("--shadow-tint tints token and primitive shadows on the element and its subtree", () => {
    const root = mount(`<div style="--shadow-tint: rgb(255, 0, 0)">
      <div data-var style="--shadow: var(--shadow-md)">x</div>
      <div data-plain style="box-shadow: var(--shadow-md)">x</div>
    </div>`);
    const untinted = probe("box-shadow: var(--shadow-md)");
    for (const selector of ["[data-var]", "[data-plain]"]) {
      expect(style(root.querySelector(selector)!, "box-shadow"), selector).not.toBe(untinted);
    }
  });

  it("--color-shadow re-tints every shadow from the theme", () => {
    const el = mount(`<div style="--shadow: var(--shadow-md)">x</div>`);
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

  /** The [x, y] offsets of a shadow's last (farthest) layer, in px. */
  const offsets = (el: Element) => {
    const [, x, y] = /(-?[\d.e-]+)px (-?[\d.e-]+)px [\d.e-]+px 0px$/.exec(style(el, "box-shadow"))!;
    return [Number(x), Number(y)];
  };

  it("casts down by default, up at 180deg and left at 90deg", () => {
    const root = mount(`<div>
      <div data-down style="box-shadow: var(--shadow-md)">x</div>
      <div data-up style="box-shadow: var(--shadow-md); --shadow-angle: 180deg">x</div>
      <div data-left style="box-shadow: var(--shadow-md); --shadow-angle: 90deg">x</div>
    </div>`);
    const [dx, dy] = offsets(root.querySelector("[data-down]")!);
    expect(Math.abs(dx!)).toBeLessThan(0.01);
    expect(dy).toBeGreaterThan(1);
    const [ux, uy] = offsets(root.querySelector("[data-up]")!);
    expect(Math.abs(ux!)).toBeLessThan(0.01);
    expect(uy).toBeCloseTo(-dy!, 1);
    const [lx, ly] = offsets(root.querySelector("[data-left]")!);
    expect(lx).toBeCloseTo(-dy!, 1);
    expect(Math.abs(ly!)).toBeLessThan(0.01);
  });

  it("follows a breakpoint tier, and reaches the subtree's token shadows", async () => {
    const root = mount(`<div style="--shadow-angle--md: 180deg">
      <div data-child style="box-shadow: var(--shadow-md)">x</div>
    </div>`);
    const child = root.querySelector("[data-child]")!;
    await atWidth(below("md"));
    expect(offsets(child)[1]).toBeGreaterThan(0);
    await atWidth(at("md"));
    expect(offsets(child)[1]).toBeLessThan(0);
  });

  it("--default-shadow-angle sets the page's light direction", () => {
    const el = mount(`<div style="box-shadow: var(--shadow-md)">x</div>`);
    document.documentElement.style.setProperty("--default-shadow-angle", "180deg");
    try {
      // the tokens resolve on :root, so a page-wide angle reaches them there
      expect(offsets(el)[1]).toBeLessThan(0);
    } finally {
      document.documentElement.style.removeProperty("--default-shadow-angle");
    }
  });
});

describe("elevation", () => {
  useKit();

  /** The drop-shadow() functions in an element's computed filter. */
  const drops = (el: Element) => style(el, "filter").match(/drop-shadow\([^)]*\)[^)]*\)/g) ?? [];
  /** The y offset of the farthest (last) drop-shadow, in px. */
  const farY = (el: Element) => {
    const last = drops(el).at(-1) ?? "";
    return Number(/\) (-?[\d.e-]+)px (-?[\d.e-]+)px/.exec(last)?.[2]);
  };
  /** True when every drop-shadow's color is fully transparent. */
  const invisible = (el: Element) =>
    drops(el).every((d) => /\/ 0\)|rgba\(0, 0, 0, 0\)|transparent/.test(d));

  it("--elevation: n is four drop-shadows in filter, deeper as n grows", () => {
    const root = mount(`<div>
      <div data-four style="--elevation: 4">x</div>
      <div data-eight style="--elevation: 8">x</div>
    </div>`);
    const four = root.querySelector("[data-four]")!;
    expect(drops(four)).toHaveLength(4);
    expect(invisible(four)).toBe(false);
    expect(farY(four)).toBeGreaterThan(0);
    expect(farY(root.querySelector("[data-eight]")!)).toBeGreaterThan(farY(four));
  });

  it("0 and a non-number draw nothing visible", () => {
    const root = mount(`<div>
      <div data-zero style="--elevation: 0">x</div>
      <div data-word style="--elevation: md">x</div>
    </div>`);
    for (const selector of ["[data-zero]", "[data-word]"]) {
      expect(invisible(root.querySelector(selector)!), selector).toBe(true);
    }
  });

  it("composes with --filter in one filter declaration", () => {
    const root = mount(`<div>
      <div data-both style="--filter: blur(2px); --elevation: 4">x</div>
      <div data-filter style="--filter: blur(2px)">x</div>
    </div>`);
    const both = style(root.querySelector("[data-both]")!, "filter");
    expect(both.startsWith("blur(2px)")).toBe(true);
    expect(drops(root.querySelector("[data-both]")!)).toHaveLength(4);
    expect(style(root.querySelector("[data-filter]")!, "filter")).toBe("blur(2px)");
  });

  it("stays on its element: a child's own --filter carries no inherited drop-shadows", () => {
    const root = mount(`<div style="--elevation: 4">
      <div data-filter style="--filter: blur(1px)">x</div>
      <div data-tier style="--filter--hover: blur(1px)">x</div>
    </div>`);
    expect(style(root.querySelector("[data-filter]")!, "filter")).toBe("blur(1px)");
    expect(drops(root.querySelector("[data-tier]")!)).toHaveLength(0);
  });

  it("--filter: none keeps the elevation", () => {
    const el = mount(`<div style="--filter: none; --elevation: 4">x</div>`);
    expect(drops(el)).toHaveLength(4);
    expect(invisible(el)).toBe(false);
  });

  it("takes a state tier alone on a plain element", async () => {
    const el = mount(
      `<div style="inline-size: 100px; block-size: 40px; --elevation--hover: 6">x</div>`,
    );
    expect(drops(el).length === 0 || invisible(el)).toBe(true);
    await userEvent.hover(el);
    expect(invisible(el)).toBe(false);
    await userEvent.unhover(el);
  });

  it("follows --shadow-angle and the page's --default-shadow-angle, and --shadow-tint on an ancestor", () => {
    const root = mount(`<div>
      <div data-up style="--elevation: 4; --shadow-angle: 180deg">x</div>
      <div data-plain style="--elevation: 4">x</div>
      <div style="--shadow-tint: rgb(255, 0, 0)"><div data-tinted style="--elevation: 4">x</div></div>
    </div>`);
    expect(farY(root.querySelector("[data-up]")!)).toBeLessThan(0);
    const plain = root.querySelector("[data-plain]")!;
    expect(style(root.querySelector("[data-tinted]")!, "filter")).not.toBe(style(plain, "filter"));
    document.documentElement.style.setProperty("--default-shadow-angle", "180deg");
    try {
      expect(farY(plain)).toBeLessThan(0);
    } finally {
      document.documentElement.style.removeProperty("--default-shadow-angle");
    }
  });
});

describe("filters and blending", () => {
  useKit();

  it("--filter, --backdrop-filter, and --mix-blend set their properties", () => {
    const el = mount(
      `<div style="${BOX} --filter: blur(2px); --backdrop-filter: saturate(2); --mix-blend: multiply">x</div>`,
    );
    expect(style(el, "filter")).toBe("blur(2px)");
    expect(style(el, "backdrop-filter")).toBe("saturate(2)");
    expect(style(el, "mix-blend-mode")).toBe("multiply");
  });

  it("take state tiers: grayscale at rest, none hovered", async () => {
    const el = mount(
      `<div style="${BOX} --filter: grayscale(1); --filter--hover: none; --mix-blend: multiply; --mix-blend--hover: normal">x</div>`,
    );
    expect(style(el, "filter")).toBe("grayscale(1)");
    expect(style(el, "mix-blend-mode")).toBe("multiply");
    await userEvent.hover(el);
    expect(style(el, "filter")).toBe("none");
    expect(style(el, "mix-blend-mode")).toBe("normal");
    await userEvent.unhover(el);
  });

  it("work tier-only: a hover tier alone leaves the initial value at rest", async () => {
    const el = mount(
      `<div style="${BOX} --filter--hover: blur(1px); --backdrop-filter--hover: blur(4px); --mix-blend--hover: screen">x</div>`,
    );
    expect(style(el, "filter")).toBe("none");
    expect(style(el, "backdrop-filter")).toBe("none");
    expect(style(el, "mix-blend-mode")).toBe("normal");
    await userEvent.hover(el);
    expect(style(el, "filter")).toBe("blur(1px)");
    expect(style(el, "backdrop-filter")).toBe("blur(4px)");
    expect(style(el, "mix-blend-mode")).toBe("screen");
    await userEvent.unhover(el);
  });

  it("reach ::before through --before-*", () => {
    const el = mount(
      `<div style="${BOX} --position: relative; --before-content: ''; --before-position: absolute; --before-inset: 0; --before-filter: blur(3px); --before-backdrop-filter: blur(5px); --before-mix-blend: overlay">x</div>`,
    );
    expect(style(el, "filter", "::before")).toBe("blur(3px)");
    expect(style(el, "backdrop-filter", "::before")).toBe("blur(5px)");
    expect(style(el, "mix-blend-mode", "::before")).toBe("overlay");
  });
});
