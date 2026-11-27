"use strict";

/**
 * @fileoverview The reset's search clear button: the kit's mask icon, drawn in
 * `--search-cancel-color`, replaces the browser's own glyph.
 */

import { describe, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { frame, mount, useKit } from "../../test/browser.ts";

describe("search clear button", () => {
  useKit();

  /** Whether any pixel in the input's last fifth is red (at full or the hover's half opacity). */
  async function redAtEnd(el: HTMLElement): Promise<boolean> {
    await frame();
    // without saving, the screenshot comes back as the base64 string itself
    const base64 = await page.screenshot({ element: el, save: false });
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const from = Math.floor(img.width * 0.8);
    const { data } = ctx.getImageData(from, 0, img.width - from, img.height);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 200 && data[i + 1] < 160 && data[i + 2] < 160) return true;
    }
    return false;
  }

  // The icon is a mask over `--search-cancel-color` (currentColor by default), so
  // red text means a red icon. The browser's own glyph ignores the text color.
  it("draws the kit's icon in the text color, not the browser's glyph", async () => {
    const el = mount(
      `<input type="search" value="x" style="color: rgb(255 0 0); inline-size: 300px; padding-inline: 8px" />`,
    ) as HTMLInputElement;
    el.focus();
    expect(await redAtEnd(el)).toBe(true);
  });
});
