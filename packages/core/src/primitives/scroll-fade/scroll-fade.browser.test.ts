"use strict";

/**
 * @fileoverview The scroll-fade primitive: a mask on the scroller's block
 * edges, or its inline edges with `data-scroll-fade-axis="x"`.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../../test/browser.ts";

describe("scroll-fade", () => {
  useKit();

  it("masks the block edges by default and the inline edges on the x axis", () => {
    const root = mount(`<div>
      <div data-ui="scroll-fade" data-y style="--h: 20; --overflow-y: auto"><p>a</p><p>b</p><p>c</p><p>d</p><p>e</p></div>
      <div data-ui="scroll-fade" data-scroll-fade-axis="x" data-x style="--overflow-x: auto"><p>a</p></div>
      <div data-plain>a</div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-y]"), "mask-image")).toContain("linear-gradient(");
    expect(style(at("[data-y]"), "mask-image")).not.toContain("to right");
    expect(style(at("[data-x]"), "mask-image")).toContain("to right");
    expect(style(at("[data-plain]"), "mask-image")).toBe("none");
  });

  it("lets --ui-scroll-fade-mask replace the whole mask", () => {
    const scroller = mount(
      `<div data-ui="scroll-fade" style="--ui-scroll-fade-mask: none; --overflow-y: auto"><p>a</p></div>`,
    );
    expect(style(scroller, "mask-image")).toBe("none");
  });
});
