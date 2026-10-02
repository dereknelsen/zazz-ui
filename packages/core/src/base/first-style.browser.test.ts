"use strict";

/**
 * @fileoverview The first style pass: when anything resolves styles before the
 * kit's stylesheet applies (a head script, an extension, assistive tech), the
 * kit's arrival must not transition primitives in from their UA styles, and
 * transitions must work again once the page has settled.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { frame, kitCss, mount } from "../../test/browser.ts";

const MARKUP = `<div>
  <a data-ui="button" data-button-variant="ghost" href="#">ghost</a>
  <button data-ui="button" type="button">default</button>
  <a data-ui="badge" href="#">badge</a>
  <input data-ui="input" />
</div>`;

let sheet: HTMLStyleElement | undefined;

/** Resolves every element's style, then applies the kit. */
function kitArrivesAfterStyle(root: Element): void {
  for (const el of root.children) getComputedStyle(el).color;
  sheet = document.createElement("style");
  sheet.textContent = kitCss();
  document.head.append(sheet);
}

const running = (root: Element) =>
  [...root.children].flatMap((el) =>
    el
      .getAnimations()
      .map((animation) => `${el.textContent}: ${(animation as CSSTransition).transitionProperty}`),
  );

describe("first style pass", () => {
  afterEach(() => {
    sheet?.remove();
    sheet = undefined;
  });

  it("does not transition primitives from their UA styles when the kit's stylesheet arrives", () => {
    const root = mount(MARKUP);
    kitArrivesAfterStyle(root);
    for (const el of root.children) getComputedStyle(el).color;
    expect(running(root)).toEqual([]);
  });

  it("transitions a state change once the page has settled", async () => {
    const root = mount(MARKUP);
    kitArrivesAfterStyle(root);
    await Promise.all(document.documentElement.getAnimations().map((a) => a.finished));
    await frame();
    const ghost = root.firstElementChild!;
    ghost.setAttribute("data-button-variant", "primary");
    getComputedStyle(ghost).color;
    expect(ghost.getAnimations().length).toBeGreaterThan(0);
  });
});
