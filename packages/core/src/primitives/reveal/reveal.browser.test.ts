"use strict";

/**
 * @fileoverview The reveal: a target starts hidden and shows once the
 * script marks it `data-reveal-state="in-view"`; stagger children follow.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

describe("reveal", () => {
  useKit();
  useCss(`[data-reveal], [data-reveal-each] > * { transition: none !important; }`);

  it("hides a target until it is marked in view", () => {
    const root = mount(`<div>
      <p data-reveal="fade" data-hidden>a</p>
      <p data-reveal="fade" data-reveal-state="in-view" data-shown>b</p>
      <div data-reveal-each="slide-up"><p data-child-hidden>c</p><p data-reveal-state="in-view" data-child-shown>d</p></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-hidden]"), "opacity")).toBe("0");
    expect(style(at("[data-shown]"), "opacity")).toBe("1");
    expect(style(at("[data-child-hidden]"), "opacity")).toBe("0");
    expect(style(at("[data-child-hidden]"), "transform")).not.toBe("none");
    expect(style(at("[data-child-shown]"), "opacity")).toBe("1");
  });
});
