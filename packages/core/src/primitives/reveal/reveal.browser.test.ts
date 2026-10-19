"use strict";

/**
 * @fileoverview The reveal: a target starts hidden and shows once the
 * script marks it `data-reveal-state="in-view"`; stagger children follow.
 */

import { describe, expect, it } from "vite-plus/test";
import { Reveal } from "../../base/reveal.ts";
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

describe("reveal stagger step", () => {
  useKit();
  const native = CSS.supports("top", "calc(sibling-index() * 1px)");
  const delays = (group: Element) =>
    Array.from(group.children, (child) => style(child, "transition-delay"));

  it.runIf(native)("defaults to --ui-reveal-global-stagger-step", () => {
    const group = mount(`<div data-reveal-each="fade"><p>a</p><p>b</p><p>c</p></div>`);
    expect(delays(group)).toEqual(["0s", "0.12s", "0.24s"]);
  });

  it.runIf(native)("takes the global override from any ancestor", () => {
    const root = mount(`<section style="--ui-reveal-global-stagger-step: 50ms">
      <div data-reveal-each="fade"><p>a</p><p>b</p><p>c</p></div>
    </section>`);
    expect(delays(root.firstElementChild!)).toEqual(["0s", "0.05s", "0.1s"]);
  });

  it.runIf(native)("takes --ui-reveal-stagger-step on the group, reversed too", () => {
    const group = mount(`<div data-reveal-each="fade" data-reveal-order="reversed"
      style="--ui-reveal-stagger-step: 30ms"><p>a</p><p>b</p><p>c</p></div>`);
    expect(delays(group)).toEqual(["0.06s", "0.03s", "0s"]);
  });

  it("writes data-reveal-step (ms or CSS time) on the group", () => {
    const root = mount(`<div>
      <div data-reveal-each="fade" data-reveal-step="0.1s"><p>a</p><p>b</p></div>
      <div data-reveal-each="fade" style="--ui-reveal-stagger-step: 30ms"><p>a</p><p>b</p></div>
    </div>`);
    new Reveal();
    const [timed, styled] = Array.from(root.children);
    expect(style(timed!, "--ui-reveal-stagger-step")).toBe("100ms");
    // No attribute: the author's inline value is left alone.
    expect(style(styled!, "--ui-reveal-stagger-step")).toBe("30ms");
    expect(delays(timed!)[1]).toBe("0.1s");
  });
});
