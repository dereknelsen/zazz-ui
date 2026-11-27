"use strict";

/**
 * @fileoverview The password group: the shell wears the field
 * surface, `data-password-group-slot` addons order by alignment, and the
 * toggle's icons swap on the group's state.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useCss, useKit } from "../../../test/browser.ts";

const GROUP = (attrs = "") => `<ui-password><label data-ui="password-group" ${attrs}>
    <input data-ui="input" type="password" />
    <span data-password-group-slot="addon" data-password-group-align="inline-end" data-trail>
      <button data-ui="button" data-password-group-slot="toggle" type="button">
        <svg data-password-group-slot="icon-show" data-show></svg><svg data-password-group-slot="icon-hide" data-hide></svg>
      </button>
    </span>
  </label></ui-password>`;

describe("password group", () => {
  useKit();
  useCss(`[data-ui~="password-group"], [data-ui~="input"] { transition: none; }`);

  it("sizes the toggle to the field inset, with no size preset", () => {
    const root = mount(`<div>
      <ui-password><label data-ui="password-group" data-shell>
        <input data-ui="input" type="password" name="pw" />
        <span data-password-group-slot="addon" data-password-group-align="inline-end">
          <button data-ui="button" data-button-size="icon" data-password-group-slot="toggle" type="button" aria-label="Show password">
            <svg data-password-group-slot="icon-show"></svg>
          </button>
        </span>
      </label></ui-password>
      <ui-password><label data-ui="password-group" data-empty><input data-ui="input" type="password" name="pw2" /><span data-password-group-slot="addon" data-password-group-align="inline-end"><svg viewBox="0 0 16 16"></svg></span></label></ui-password>
    </div>`);
    const toggle = root.querySelector("button")!.getBoundingClientRect();
    const inset = lengthPx("calc(var(--ui-field-h) - 2 * var(--ui-field-inset-p))");
    expect(toggle.height).toBeCloseTo(inset, 0);
    expect(toggle.width).toBeCloseTo(toggle.height, 0);
    // the toggle fits the addon, so the group is as tall as one with an icon addon
    expect(root.querySelector("[data-shell]")!.getBoundingClientRect().height).toBeCloseTo(
      root.querySelector("[data-empty]")!.getBoundingClientRect().height,
      0,
    );
  });

  it("orders the trailing addon, hides the inactive icon, and takes a --gap utility", () => {
    const root = mount(
      `<div>${GROUP("data-default")}${GROUP('data-utility style="--gap: 4"')}</div>`,
    );
    const plain = root.querySelector("[data-default]")!;
    expect(style(plain, "display")).toBe("flex");
    expect(style(plain.querySelector("[data-trail]")!, "order")).toBe("1");
    expect(style(plain.querySelector("[data-hide]")!, "display")).toBe("none");
    expect(style(plain.querySelector("[data-show]")!, "display")).not.toBe("none");
    expect(Number.parseFloat(style(plain, "column-gap"))).toBeCloseTo(
      lengthPx("var(--ui-password-group-gap)"),
      1,
    );
    expect(
      Number.parseFloat(style(root.querySelector("[data-utility]")!, "column-gap")),
    ).toBeCloseTo(scale(4), 1);
  });
});
