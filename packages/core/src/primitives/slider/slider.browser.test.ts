"use strict";

/**
 * @fileoverview The slider: the thumb takes its size from the
 * `:root` hook, and a subtree hook reaches it.
 */

import { describe, expect, it } from "vite-plus/test";
import { page, server } from "vite-plus/test/browser/context";
import { frame, lengthPx, mount, style, useKit } from "../../../test/browser.ts";

describe("slider", () => {
  useKit();

  // Pseudo-element boxes cannot be measured, so the test reads the hooks the
  // thumb and track rules consume, on the element they inherit through.
  it("reaches the thumb hook from :root or a subtree, and derives the thumb offset", () => {
    const root = mount(`<div>
      <input type="range" data-default />
      <div style="--ui-slider-thumb-size: 40px; --ui-slider-track-h: 10px; --ui-slider-track-border-width: 2px"><input type="range" data-subtree /></div>
    </div>`);
    const plain = root.querySelector("[data-default]")!;
    const themed = root.querySelector("[data-subtree]")!;
    expect(lengthPx(style(plain, "--ui-slider-thumb-size"))).toBeCloseTo(
      lengthPx("var(--ui-slider-thumb-size)"),
      1,
    );
    expect(style(themed, "--ui-slider-thumb-size")).toBe("40px");
    // centered in the track's content box: (10px - 40px) / 2 - 2px of border, negated
    // because a length probe can't go below 0
    expect(lengthPx(`calc(-1 * (${style(themed, "--ui-slider-thumb-offset")}))`)).toBeCloseTo(
      17,
      1,
    );
  });
});

// The fill's progress comes from a view timeline on the thumb, which no script API
// exposes, so these tests read the painted track from a screenshot.
describe("slider fill", () => {
  useKit();

  /** RGB of the screenshot pixel at `x` (0 to 1 across the input) on its middle row. */
  async function pixel(el: HTMLElement, x: number): Promise<[number, number, number]> {
    await frame();
    // without saving, the screenshot comes back as the base64 string itself
    const base64 = await page.screenshot({ element: el, save: false });
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const [r, g, b] = ctx.getImageData(Math.round(img.width * x), img.height >> 1, 1, 1).data;
    return [r, g, b];
  }

  const RED: [number, number, number] = [255, 0, 0];
  const BLUE: [number, number, number] = [0, 0, 255];
  // a wide track, so no sample point falls under the thumb
  const hooks = `--ui-slider-fill-bg: rgb(255 0 0); --ui-slider-track-bg: rgb(0 0 255); --ui-slider-track-h: 12px; inline-size: 400px`;
  const slider = (attrs: string, extra = "") =>
    mount(`<input type="range" ${attrs} style="${hooks}; ${extra}" />`) as HTMLInputElement;

  it("defaults the fill to the primary color", () => {
    const el = mount(`<input type="range" />`);
    expect(style(el, "--ui-slider-fill-bg")).toBe(style(el, "--color-primary"));
  });

  it("fills from the start to the thumb, and follows the value", async () => {
    const el = slider(`value="25"`);
    expect(await pixel(el, 0.1)).toEqual(RED);
    expect(await pixel(el, 0.5)).toEqual(BLUE);
    el.value = "75";
    expect(await pixel(el, 0.5)).toEqual(RED);
    expect(await pixel(el, 0.9)).toEqual(BLUE);
  });

  it("fills from the thumb to the end with --ui-slider-fill-side: end", async () => {
    const el = slider(`value="25"`, "--ui-slider-fill-side: end");
    expect(await pixel(el, 0.1)).toEqual(BLUE);
    expect(await pixel(el, 0.5)).toEqual(RED);
  });

  // Firefox's progress part follows the direction; Chromium and Safari disagree on which
  // way an RTL view timeline runs, so they leave the track unfilled.
  it("fills from the right in a right-to-left slider in Firefox, and not at all elsewhere", async () => {
    const el = slider(`value="25" dir="rtl"`);
    expect(await pixel(el, 0.9)).toEqual(server.browser === "firefox" ? RED : BLUE);
    expect(await pixel(el, 0.5)).toEqual(BLUE);
  });
});
