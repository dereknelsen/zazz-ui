"use strict";

/**
 * @fileoverview The textarea: field-family surface, dual-mode `--p`
 * over the padding hook, and the focus ring published to `--_focus-ring`.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, tabTo, useCss, useKit } from "../../../test/browser.ts";

describe("textarea", () => {
  useKit();
  useCss(`[data-ui~="textarea"] { transition: none; }`);

  it("takes the field padding and a scale-number --p utility", () => {
    const root = mount(`<div>
      <textarea data-ui="textarea" data-default></textarea>
      <textarea data-ui="textarea" data-utility style="--p: 6"></textarea>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-default]"), "padding-inline-start"))).toBeCloseTo(
      lengthPx("var(--ui-field-px)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "padding-inline-start"))).toBeCloseTo(
      scale(6),
      1,
    );
    expect(style(at("[data-default]"), "resize")).toBe("vertical");
  });

  it("the focus ring survives a --shadow utility", async () => {
    const el = mount(
      `<textarea data-ui="textarea" style="--shadow: 0 4px 8px rgba(0, 0, 0, 0.2)"></textarea>`,
    );
    const ring = `0px 0px 0px ${lengthPx("calc(var(--ring-offset-width) + var(--ring-width))")}px`;
    expect(style(el, "box-shadow")).not.toContain(ring);
    await tabTo(el);
    expect(style(el, "box-shadow")).toContain(ring);
    expect(style(el, "box-shadow")).toContain("0px 4px 8px");
  });
});
