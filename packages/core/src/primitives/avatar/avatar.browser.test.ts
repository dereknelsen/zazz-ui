"use strict";

/**
 * @fileoverview The avatar: sized and rounded from its hooks or utilities, with
 * the image piled over the fallback and clipped to the avatar's corners.
 */

import { describe, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";
import { frame, lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

const avatar = (attrs = "", image = true) =>
  mount(`<span data-ui="avatar" role="img" aria-label="Ada Lovelace" ${attrs}>
    ${image ? `<img data-avatar-slot="image" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='rgb(0,255,0)'/%3E%3C/svg%3E" />` : ""}
    <span data-avatar-slot="fallback" aria-hidden="true">AL</span>
  </span>`);

const slot = (root: Element, name: string) => root.querySelector(`[data-avatar-slot~="${name}"]`)!;

/** RGB of the screenshot pixel at the center of `el`. */
async function center(el: HTMLElement): Promise<[number, number, number]> {
  await frame();
  // without saving, the screenshot comes back as the base64 string itself
  const base64 = await page.screenshot({ element: el, save: false });
  const img = new Image();
  img.src = `data:image/png;base64,${base64}`;
  await img.decode();
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width >> 1, img.height >> 1, 1, 1).data;
  return [r, g, b];
}

describe("avatar", () => {
  useKit();

  it("sizes from the hook, a scale number or a length, or from a --size utility", () => {
    const width = (el: Element) => el.getBoundingClientRect().width;
    expect(width(avatar())).toBeCloseTo(lengthPx("var(--ui-avatar-size)"), 1);
    expect(width(avatar(`style="--ui-avatar-size: 12"`))).toBeCloseTo(scale(12), 1);
    expect(width(avatar(`style="--ui-avatar-size: 30px"`))).toBe(30);
    const sized = avatar(`style="--size: 8"`);
    expect(width(sized)).toBeCloseTo(scale(8), 1);
    expect(sized.getBoundingClientRect().height).toBeCloseTo(scale(8), 1);
  });

  it("rounds fully by default, and takes a number on the hook or a --radius utility", () => {
    const corner = (el: Element) => style(el, "border-start-start-radius");
    expect(corner(avatar())).toBe(`${lengthPx("var(--radius-full)")}px`);
    expect(Number.parseFloat(corner(avatar(`style="--ui-avatar-radius: 2"`)))).toBeCloseTo(
      scale(2),
      1,
    );
    expect(Number.parseFloat(corner(avatar(`style="--radius: 1"`)))).toBeCloseTo(scale(1), 1);
  });

  it("piles the image over the fallback, both filling the avatar, and clips to its corners", () => {
    const root = avatar(`style="--ui-avatar-size: 40px; --ui-avatar-border-width: 0px"`);
    const image = slot(root, "image").getBoundingClientRect();
    const fallback = slot(root, "fallback").getBoundingClientRect();
    expect([image.width, image.height]).toEqual([40, 40]);
    expect([fallback.width, fallback.height]).toEqual([40, 40]);
    expect([image.x, image.y]).toEqual([fallback.x, fallback.y]);
    expect(document.elementFromPoint(image.x + 20, image.y + 20)).toBe(slot(root, "image"));
    expect(style(root, "overflow")).toBe("clip");
  });

  it("paints the fallback from its hooks, and shows it where there is no image", async () => {
    const plain = slot(avatar("", false), "fallback");
    expect(style(plain, "background-color")).toBe(
      style(mount(`<i style="color: var(--color-muted)"></i>`), "color"),
    );
    const root = avatar(
      `style="--ui-avatar-fallback-bg: rgb(255 0 0); --ui-avatar-fallback-text: rgb(0 0 255)"`,
      false,
    );
    expect(style(slot(root, "fallback"), "color")).toBe("rgb(0, 0, 255)");
    expect(await center(root)).toEqual([255, 0, 0]);
  });

  it("covers the fallback with a loaded image", async () => {
    const root = avatar(`style="--ui-avatar-fallback-bg: rgb(255 0 0)"`);
    await (slot(root, "image") as HTMLImageElement).decode();
    expect(await center(root)).toEqual([0, 255, 0]);
  });

  it("takes its font from the hooks, and the fallback inherits it", () => {
    const root = avatar(`style="--ui-avatar-font-size: 21px; --ui-avatar-font-weight: 700"`);
    expect(style(slot(root, "fallback"), "font-size")).toBe("21px");
    expect(style(slot(root, "fallback"), "font-weight")).toBe("700");
  });
});
