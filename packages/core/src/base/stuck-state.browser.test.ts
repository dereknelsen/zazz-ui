"use strict";

/**
 * @fileoverview The experimental `stuck` state, native: a sticky element (or one
 * with `--stuck-state`) is a scroll-state container, and `--<utility>--stuck`
 * on its descendants applies while it is stuck to its `--stuck-state` side
 * (top by default), below every other state. Skipped where container
 * scroll-state queries are unsupported.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser/context";
import { at, atWidth, below, frame, mount, style, useKit } from "../../test/browser.ts";

const supported = CSS.supports("container-type", "scroll-state");

async function scrollTo(top: number): Promise<void> {
  document.documentElement.scrollTo({ top, behavior: "instant" });
  for (let i = 0; i < 4; i++) await frame();
}

describe.skipIf(!supported)("stuck state", () => {
  useKit();
  afterEach(() => scrollTo(0));

  /** A sticky header at the top of a page three screens tall, with one reader inside. */
  const page = (container: string, reader: string) =>
    mount(`<div style="block-size: 300vh">
      <header style="--position: sticky; ${container}"><p data-reader style="${reader}">x</p></header>
    </div>`).querySelector("[data-reader]")!;

  it("defaults to top: applies to descendants once the header sticks, not at rest", async () => {
    const el = page("--top: 0", "--opacity--stuck: 0.5");
    expect(style(el, "opacity")).toBe("1");
    await scrollTo(200);
    expect(style(el, "opacity")).toBe("0.5");
    await scrollTo(0);
    expect(style(el, "opacity")).toBe("1");
  });

  it("follows --stuck-state: a bottom side never matches a top-stuck header", async () => {
    const el = page("--top: 0; --stuck-state: bottom", "--opacity--stuck: 0.5");
    await scrollTo(200);
    expect(style(el, "opacity")).toBe("1");
  });

  it("drops the state where the element stops being sticky", async () => {
    const el = page("--top: 0; --position--md: static", "--opacity--stuck: 0.5");
    await atWidth(below("md"));
    await scrollTo(200);
    expect(style(el, "opacity")).toBe("0.5");
    await atWidth(at("md"));
    await scrollTo(250);
    expect(style(el, "opacity")).toBe("1");
  });

  it("sits below every other state: hover beats stuck", async () => {
    const el = page(
      "--top: 0",
      "--bg: rgb(0, 0, 255); --bg--stuck: rgb(0, 255, 0); --bg--hover: rgb(255, 0, 0)",
    );
    const probe = (color: string) => {
      const p = document.createElement("i");
      p.style.cssText = `background-color: oklch(from ${color} l c h / 1)`;
      document.body.append(p);
      const value = style(p, "background-color");
      p.remove();
      return value;
    };
    await scrollTo(200);
    expect(style(el, "background-color")).toBe(probe("rgb(0, 255, 0)"));
    await userEvent.hover(el);
    expect(style(el, "background-color")).toBe(probe("rgb(255, 0, 0)"));
    await userEvent.unhover(el);
  });
});
