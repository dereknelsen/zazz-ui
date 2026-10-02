"use strict";

/**
 * @fileoverview Badge: states apply only to interactive badges
 * (`button`, `a[href]`), a `data-badge-variant` writes privates a utility beats,
 * and the focus ring needs focus alone.
 */

import { describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { lengthPx, mount, style, tabTo, useCss, useKit } from "../../../test/browser.ts";

const background = (el: Element) => style(el, "background-color");

describe("badge", () => {
  useKit();
  useCss(`[data-ui~="badge"] { transition: none; }`);

  it("hover recolors a button badge but not a static span badge", async () => {
    const root = mount(`<div>
      <span data-ui="badge" data-static>Category</span>
      <button data-ui="badge" data-interactive type="button">Category</button>
    </div>`);
    const span = root.querySelector("[data-static]")!;
    const button = root.querySelector("[data-interactive]")!;
    const rest = background(span);
    expect(background(button)).toBe(rest);
    await userEvent.hover(span);
    expect(background(span)).toBe(rest);
    await userEvent.hover(button);
    expect(background(button)).not.toBe(rest);
    await userEvent.unhover(button);
  });

  it("a --bg utility beats the primary variant", () => {
    const root = mount(`<div>
      <span data-ui="badge" data-reference>a</span>
      <span data-ui="badge" data-badge-variant="primary" data-primary>b</span>
      <span data-ui="badge" data-badge-variant="primary" data-utility style="--bg: rgb(1, 2, 3)">c</span>
      <div data-plain style="--bg: rgb(1, 2, 3)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(background(at("[data-primary]"))).not.toBe(background(at("[data-reference]")));
    expect(background(at("[data-utility]"))).toBe(background(at("[data-plain]")));
  });

  it("shows the focus ring on keyboard focus without hover", async () => {
    const el = mount(`<button data-ui="badge" type="button">New</button>`);
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    expect(style(el, "box-shadow")).not.toContain(ring);
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
  });
});
