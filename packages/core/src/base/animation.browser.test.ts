"use strict";

/**
 * @fileoverview `--animation` takes any `animation` value, at any tier. The
 * kit's loops are tokens: `spin` runs at constant speed, the rest on the default
 * transition easing. Reduced motion stops every value, a raw one included.
 */

import { userEvent } from "vite-plus/test/browser";
import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, kitCss, mount, style, useKit } from "../../test/browser.ts";

describe("--animation", () => {
  useKit();

  it("the loop tokens run forever: spin at constant speed, the others on the default easing", () => {
    const root = mount(`<div>
      <i data-spin style="--animation: var(--spin)"></i>
      <i data-ping style="--animation: var(--ping)"></i>
      <i data-pulse style="--animation: var(--pulse)"></i>
      <i data-bounce style="--animation: var(--bounce)"></i>
      <i data-probe style="transition-timing-function: var(--default-transition-timing-function)"></i>
    </div>`);
    const easing = style(root.querySelector("[data-probe]")!, "transition-timing-function");
    for (const [name, duration, timing] of [
      ["spin", "1s", "linear"],
      ["ping", "1s", easing],
      ["pulse", "2s", easing],
      ["bounce", "1s", easing],
    ] as const) {
      const el = root.querySelector(`[data-${name}]`)!;
      expect(style(el, "animation-name"), name).toBe(name);
      expect(style(el, "animation-duration"), name).toBe(duration);
      expect(style(el, "animation-iteration-count"), name).toBe("infinite");
      expect(style(el, "animation-timing-function"), name).toBe(timing);
    }
  });

  it("every kit keyframe actually runs", () => {
    const root = mount(`<div>
      <i style="--animation: var(--spin)"></i><i style="--animation: var(--ping)"></i>
      <i style="--animation: var(--pulse)"></i><i style="--animation: var(--bounce)"></i>
    </div>`);
    for (const el of root.children) expect(el.getAnimations()).toHaveLength(1);
  });

  it("a keyframe name composes with --default-animation", () => {
    const el = mount(`<i style="--animation: spin var(--default-animation)"></i>`);
    expect(style(el, "animation-name")).toBe("spin");
    expect(style(el, "animation-duration")).toBe("1s");
    expect(style(el, "animation-iteration-count")).toBe("infinite");
  });

  it("follows breakpoints, and a state beats them", async () => {
    const el = mount(
      `<button style="--animation: none; --animation--hover: var(--spin); --animation--md: var(--ping)">x</button>`,
    );
    // the pointer stays wherever an earlier test left it, which can be over a new mount
    await userEvent.unhover(el);
    await atWidth(below("md"));
    expect(style(el, "animation-name")).toBe("none");
    await atWidth(at("md"));
    expect(style(el, "animation-name")).toBe("ping");
    await userEvent.hover(el);
    expect(style(el, "animation-name")).toBe("spin");
    await userEvent.unhover(el);
  });

  it("a tier applies with no base", async () => {
    const el = mount(`<i style="--animation--md: var(--pulse)"></i>`);
    await atWidth(at("md"));
    expect(style(el, "animation-name")).toBe("pulse");
  });

  it("the motion channel stops every value, and reduced motion sets it", () => {
    const root = mount(`<div style="--_motion-off: none">
      <i data-token style="--animation: var(--spin)"></i>
      <i data-raw style="--animation: spin 1s infinite"></i>
    </div>`);
    expect(style(root.querySelector("[data-token]")!, "animation-name")).toBe("none");
    expect(style(root.querySelector("[data-raw]")!, "animation-name")).toBe("none");
    expect(kitCss()).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*--_motion-off: none;/,
    );
  });
});
