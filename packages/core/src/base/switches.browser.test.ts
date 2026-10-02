"use strict";

/**
 * @fileoverview Switches: `data-ui="sr-only"` hides visually and keeps
 * the element in the accessibility tree.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../test/browser.ts";

describe("switches", () => {
  useKit();

  it("sr-only clips the element to one pixel without hiding it", () => {
    const root = mount(
      `<div><legend data-ui="sr-only" data-hidden>Contact</legend><span>visible</span></div>`,
    );
    const hidden = root.querySelector("[data-hidden]")!;
    expect(style(hidden, "position")).toBe("absolute");
    expect(style(hidden, "inline-size")).toBe("1px");
    expect(style(hidden, "display")).not.toBe("none");
    expect(style(hidden, "visibility")).toBe("visible");
  });

  it("grid-pile stacks every child in one grid area", () => {
    const root = mount(
      `<div data-ui="grid-pile" style="--display: grid"><span data-a>a</span><span data-b>b</span></div>`,
    );
    const a = root.querySelector("[data-a]")!;
    const b = root.querySelector("[data-b]")!;
    expect(style(a, "grid-area")).toBe(style(b, "grid-area"));
    expect(a.getBoundingClientRect().top).toBe(b.getBoundingClientRect().top);
  });
});
