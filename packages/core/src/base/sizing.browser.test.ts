"use strict";

/**
 * @fileoverview The first utility, `--w`: dual-mode
 * values, utilities set through the CSSOM, and gate exactness.
 */

import { describe, expect, it } from "vite-plus/test";
import { atWidth, lengthPx, mount, scale, useKit } from "../../test/browser.ts";

const width = (el: Element) => el.getBoundingClientRect().width;

describe("--w", () => {
  useKit();

  it("resolves a scale number, a length, a percentage, zero, and a token", async () => {
    await atWidth(1024);
    const root = mount(`
      <div style="inline-size: 500px">
        <div data-n style="--w: 4"></div>
        <div data-len style="--w: 6rem"></div>
        <div data-pct style="--w: 100%"></div>
        <div data-zero style="--w: 0"></div>
        <div data-token style="--w: var(--space-md)"></div>
      </div>
    `);
    expect(width(root.querySelector("[data-n]")!)).toBeCloseTo(scale(4), 1);
    expect(width(root.querySelector("[data-len]")!)).toBe(96);
    expect(width(root.querySelector("[data-pct]")!)).toBe(500);
    expect(width(root.querySelector("[data-zero]")!)).toBe(0);
    expect(width(root.querySelector("[data-token]")!)).toBeCloseTo(lengthPx("var(--space-md)"), 1);
    expect(lengthPx("var(--space-md)")).toBeGreaterThan(0);
  });

  it("applies after style.setProperty on an element that had no style attribute", () => {
    const el = mount(`<div></div>`);
    el.style.setProperty("--w", "4");
    expect(width(el)).toBeCloseTo(scale(4), 1);
  });

  it("is not triggered by --w--md, --min-w:, --max-w:, or --before-w alone", async () => {
    await atWidth(1024);
    const root = mount(`
      <div style="inline-size: 500px">
        <div data-plain></div>
        <div style="--w--md: 4"></div>
        <div style="--min-w: 0"></div>
        <div style="--max-w: 100%"></div>
        <div style="--before-w: 4"></div>
      </div>
    `);
    const plain = width(root.querySelector("[data-plain]")!);
    expect(plain).toBe(500);
    for (const el of root.querySelectorAll("[style]")) expect(width(el)).toBe(plain);
  });

  it("the highest matching breakpoint wins: 1rem, 2rem at sm, 3rem at lg", async () => {
    const el = mount(`<div style="--w: 1rem; --w--sm: 2rem; --w--lg: 3rem"></div>`);
    await atWidth(600);
    expect(width(el)).toBe(16);
    await atWidth(700);
    expect(width(el)).toBe(32);
    await atWidth(1100);
    expect(width(el)).toBe(48);
  });

  it("the md setter gate matches --w--md and misses --cqi-md", async () => {
    await atWidth(800);
    const root = mount(`
      <div>
        <div data-hit style="--w: 1rem; --w--md: 2rem"></div>
        <div data-miss style="--w: 1rem; --cqi-md: true"></div>
      </div>
    `);
    expect(width(root.querySelector("[data-hit]")!)).toBe(32);
    expect(width(root.querySelector("[data-miss]")!)).toBe(16);
  });

  it("keywords switch the element to raw sizing at every tier", async () => {
    await atWidth(800);
    const root = mount(`
      <div style="inline-size: 500px">
        <div style="display: inline-block; --w: 100%; --w--md: auto">x</div>
        <div style="display: inline-block; --w: 100%; --w--md: fit-content">x</div>
        <div style="--overflow: auto; --w: 4"></div>
      </div>
    `);
    const [toAuto, toFit, unrelated] = root.children;
    // shrink-to-fit: the width of one glyph, not zero (a failed dual parse) and not the container
    expect(width(toAuto)).toBeGreaterThan(0);
    expect(width(toAuto)).toBeLessThan(100);
    expect(width(toFit)).toBeGreaterThan(0);
    expect(width(toFit)).toBeLessThan(100);
    expect(width(unrelated)).toBeCloseTo(scale(4), 1);
    await atWidth(600);
    expect(width(toAuto)).toBe(500);
    expect(width(toFit)).toBe(500);
  });
});
