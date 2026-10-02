"use strict";

/**
 * @fileoverview The input group: the shell wears the field surface,
 * `data-input-group-slot` addons order by `data-input-group-align`, and a
 * dual-mode `--gap` utility beats the hook.
 */

import { describe, expect, it } from "vite-plus/test";
import {
  lengthPx,
  mount,
  scale,
  settled,
  style,
  tabTo,
  useCss,
  useKit,
} from "../../../test/browser.ts";

const GROUP = (attrs = "") => `<label data-ui="input-group" ${attrs}>
    <span data-input-group-slot="addon" data-lead>@</span>
    <input data-ui="input" />
    <span data-input-group-slot="addon" data-input-group-align="inline-end" data-trail>.com</span>
  </label>`;

describe("input group", () => {
  useKit();
  useCss(`[data-ui~="input-group"], [data-ui~="input"] { transition: none; }`);

  it("orders addons by alignment and takes a --gap utility over the hook", () => {
    const root = mount(
      `<div>${GROUP("data-default")}${GROUP('data-utility style="--gap: 4"')}</div>`,
    );
    const plain = root.querySelector("[data-default]")!;
    expect(style(plain, "display")).toBe("flex");
    expect(style(plain.querySelector("[data-lead]")!, "order")).toBe("-1");
    expect(style(plain.querySelector("[data-trail]")!, "order")).toBe("1");
    expect(Number.parseFloat(style(plain, "column-gap"))).toBeCloseTo(
      lengthPx("var(--ui-input-group-gap)"),
      1,
    );
    expect(
      Number.parseFloat(style(root.querySelector("[data-utility]")!, "column-gap")),
    ).toBeCloseTo(scale(4), 1);
  });

  it("the shell's focus ring survives a --shadow utility", async () => {
    const shell = mount(GROUP('style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)"'));
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    await tabTo(shell.querySelector("input")!);
    await settled(shell);
    expect(style(shell, "box-shadow")).toContain(ring);
    expect(style(shell, "box-shadow")).toContain("0px 4px 8px");
  });
});
