"use strict";

/**
 * @fileoverview The breakpoint flags are set once on
 * body from the html container and reach every descendant's style query, and
 * making html an inline-size container moves nothing.
 */

import { describe, expect, it } from "vite-plus/test";
import { allFragments, atWidth, frame, mount, style, useCss, useKit } from "../../test/browser.ts";

describe("breakpoint flags", () => {
  useKit(["base/_layers.css", "base/_variables.css", "base/_breakpoints.css", "base/_reset.css"]);
  useCss(`@container style(--cqi-md: true) { :where([data-probe]) { --hit: yes; } }`);

  it("a flag set once on body reaches a style query five levels deep and flips at 768px", async () => {
    const root = mount(`<div><div><div><div><div data-probe></div></div></div></div></div>`);
    const probe = root.querySelector("[data-probe]")!;
    await atWidth(767);
    expect(style(probe, "--hit").trim()).toBe("");
    await atWidth(768);
    expect(style(probe, "--hit").trim()).toBe("yes");
  });
});

describe("html as an inline-size container", () => {
  useKit();

  it("leaves every box of every primitive fragment where it was", async () => {
    await atWidth(1024);
    const root = mount(`<div>${allFragments()}</div>`);
    const fingerprint = () =>
      [...root.querySelectorAll("*")].map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName}:${r.x},${r.y},${r.width},${r.height}`;
      });
    const before = fingerprint();
    expect(before.length).toBeGreaterThan(5);
    // Breakpoint tiers read flags that html's container query sets; pin each flag
    // to its current value so only the containment itself changes.
    const flags = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"]
      .map((bp) => `--cqi-${bp}: ${style(document.body, `--cqi-${bp}`).trim() || "false"};`)
      .join(" ");
    const override = document.createElement("style");
    override.textContent = `html { container-type: normal; } body { ${flags} }`;
    document.head.append(override);
    await frame();
    expect(fingerprint()).toEqual(before);
    override.remove();
  });
});
