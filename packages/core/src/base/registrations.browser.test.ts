"use strict";

/**
 * @fileoverview The two registration behaviors the whole
 * utilities layer is built on, checked in a real engine. A typed
 * registration that fails its syntax computes to its initial value; a
 * `syntax: "*"` registration with no initial value is guaranteed-invalid when
 * unset, and a copy of an absent utility becomes guaranteed-invalid too, so both
 * fall through a var() fallback.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss } from "../../test/browser.ts";

describe("registered custom properties", () => {
  useCss(`
    @property --_p-len { syntax: "<length-percentage>"; inherits: false; initial-value: 0px; }
    @property --_w-md { syntax: "*"; inherits: false; }
    @property --w--md { syntax: "*"; inherits: false; }
    :where([style*="--p:"]) {
      --_p-len: var(--p);
      --_w-md: var(--w--md);
      padding-inline-start: var(--_p-len);
      inline-size: var(--_w-md, 1px);
    }
  `);

  it("a length registration given a scale number computes to its initial value", () => {
    const el = mount(`<div style="--p: 4"></div>`);
    expect(style(el, "padding-inline-start")).toBe("0px");
  });

  it("a * registration copied from an absent utility falls through the var() fallback", () => {
    const el = mount(`<div style="--p: 4"></div>`);
    expect(style(el, "inline-size")).toBe("1px");
  });

  it("a * registration copied from a present utility is used", () => {
    const el = mount(`<div style="--p: 4; --w--md: 7px"></div>`);
    expect(style(el, "inline-size")).toBe("7px");
  });
});
