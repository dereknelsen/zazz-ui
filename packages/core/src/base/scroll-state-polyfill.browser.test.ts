"use strict";

/**
 * @fileoverview The scroll-state polyfill (`base/scroll-state.ts`) for the
 * `stuck` state: it writes the sides a sticky container is stuck to, physical
 * and logical, to its `data-ui-stuck`, and the generated `@supports not` rules
 * turn that into `--<utility>--stuck` on its descendants. Run in Chromium with
 * `force`, with the native stuck rules left out of the kit so only the polyfill
 * can switch the state.
 */

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { frame, KIT_FILES, kitCss, mount, style, useCss, useKit } from "../../test/browser.ts";
import { ScrollState } from "./scroll-state.ts";
import { STUCK_STATE } from "./utilities.ts";

const TIER = "base/_utilities-tier-stuck.css";
const tier = kitCss([TIER]);
// the @supports not block's rules, unwrapped, then the copy rule (the last reader rule)
const fallback = tier.slice(tier.indexOf("{", tier.indexOf("@supports not")) + 1);
const copy = fallback.slice(fallback.lastIndexOf(':where([style*="--stuck:"]) {'));
const notBlock = fallback.slice(0, fallback.indexOf(copy));

async function scrollTo(top: number): Promise<void> {
  document.documentElement.scrollTo({ top, behavior: "instant" });
  for (let i = 0; i < 4; i++) await frame();
}

describe("scroll-state polyfill (stuck)", () => {
  useKit(KIT_FILES.filter((file) => file !== TIER));
  useCss(notBlock.slice(0, notBlock.lastIndexOf("}")) + copy.slice(0, copy.lastIndexOf("}") + 1));

  let header: HTMLElement;
  let reader: Element;
  let bottom: HTMLElement;
  beforeEach(async () => {
    const root = mount(`<div>
      <header data-header style="--position: sticky; --top: 0"><p data-reader style="--opacity--stuck: 0.5">x</p></header>
      <div style="block-size: 300vh"></div>
      <footer data-footer style="--position: sticky; --bottom: 0; --stuck-state: bottom"><p style="--opacity--stuck: 0.25">y</p></footer>
    </div>`);
    header = root.querySelector("[data-header]")!;
    reader = root.querySelector("[data-reader]")!;
    bottom = root.querySelector("[data-footer]")!;
    await scrollTo(0);
    ScrollState.start({ force: true });
    for (let i = 0; i < 3; i++) await frame();
  });
  afterEach(async () => {
    ScrollState.stop();
    await scrollTo(0);
  });

  it("does not start on its own where scroll-state is supported", async () => {
    ScrollState.stop();
    ScrollState.start();
    await scrollTo(200);
    expect(header.hasAttribute(STUCK_STATE.polyfill)).toBe(false);
  });

  it("marks a top-sticky header stuck once scrolled, not while it rests at its offset", async () => {
    expect(header.getAttribute(STUCK_STATE.polyfill)).toBeNull();
    await scrollTo(200);
    expect(header.getAttribute(STUCK_STATE.polyfill)).toBe("top block-start");
    await scrollTo(0);
    expect(header.getAttribute(STUCK_STATE.polyfill)).toBeNull();
  });

  it("marks a bottom-sticky footer stuck until the page reaches its end", async () => {
    expect(bottom.getAttribute(STUCK_STATE.polyfill)).toBe("bottom block-end");
    await scrollTo(document.documentElement.scrollHeight);
    expect(bottom.getAttribute(STUCK_STATE.polyfill)).toBeNull();
  });

  it("drives --<utility>--stuck on descendants through the same --stuck-state gates", async () => {
    expect(style(reader, "opacity")).toBe("1");
    await scrollTo(200);
    expect(style(reader, "opacity")).toBe("0.5");
    expect(style(bottom.firstElementChild!, "opacity")).toBe("0.25");
  });

  it("writes only side names STUCK_STATE declares, and stop() clears them", async () => {
    await scrollTo(200);
    for (const token of header.getAttribute(STUCK_STATE.polyfill)!.split(" ")) {
      expect(STUCK_STATE.sides as readonly string[]).toContain(token);
    }
    ScrollState.stop();
    expect(header.hasAttribute(STUCK_STATE.polyfill)).toBe(false);
  });
});
