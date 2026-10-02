"use strict";

/**
 * @fileoverview The separator: `data-ui="separator"` themes the
 * `<hr>`, `data-separator-orientation="vertical"` flips it, and a `--bg` utility
 * recolors it through the primitive chain.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useKit } from "../../../test/browser.ts";

describe("separator", () => {
  useKit();

  it("paints a horizontal rule one thickness tall and a vertical one wide", () => {
    const root = mount(`<div style="--display: flex; --items: stretch; block-size: 40px">
      <hr data-ui="separator" data-horizontal style="--w: 100px" />
      <hr data-ui="separator" data-vertical data-separator-orientation="vertical" />
    </div>`);
    const thickness = `${lengthPx("var(--ui-separator-thickness)")}px`;
    const horizontal = root.querySelector("[data-horizontal]")!;
    const vertical = root.querySelector("[data-vertical]")!;
    expect(style(horizontal, "block-size")).toBe(thickness);
    expect(style(vertical, "inline-size")).toBe(thickness);
    expect(style(vertical, "block-size")).toBe("40px");
  });

  it("takes a --bg utility ahead of its hook", () => {
    const root = mount(`<div>
      <hr data-ui="separator" data-default />
      <hr data-ui="separator" data-utility style="--bg: rgb(1, 2, 3)" />
      <div data-plain style="--bg: rgb(1, 2, 3)"></div>
    </div>`);
    const background = (selector: string) =>
      style(root.querySelector(selector)!, "background-color");
    expect(background("[data-utility]")).not.toBe(background("[data-default]"));
    expect(background("[data-utility]")).toBe(background("[data-plain]"));
  });
});
