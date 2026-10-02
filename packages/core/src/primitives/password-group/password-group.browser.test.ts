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
