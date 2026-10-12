"use strict";

/**
 * @fileoverview The soft status variants hold WCAG AA text contrast (4.5:1):
 * a status button's text on its tint, at rest and at its hover and active
 * steps, over the page background and a card, in light and dark. Badges and
 * callouts use the same colors (callout.browser.test.ts pins that). Colors are composited on
 * a canvas, so the measured ratio is what the reader sees through the tint.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../test/browser.ts";

const STATUS = ["info", "success", "warning", "destructive"] as const;
const THEMES = ["theme-light", "theme-dark"] as const;
/** The button's private colors per state: [surface, text]. */
const STATES = {
  rest: ["--_button-bg", "--_button-text"],
  hover: ["--_button-bg--hover", "--_button-text--hover"],
  active: ["--_button-bg--active", "--_button-text--active"],
} as const;

const canvas = document.createElement("canvas");
canvas.width = canvas.height = 1;
const paint = canvas.getContext("2d", { willReadFrequently: true })!;

/** The sRGB pixel left by painting `layers` in order, each over the last. */
function composite(...layers: string[]): [number, number, number] {
  paint.clearRect(0, 0, 1, 1);
  for (const layer of layers) {
    paint.fillStyle = "#000";
    paint.fillStyle = layer;
    paint.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
  return [r!, g!, b!];
}

function luminance([r, g, b]: [number, number, number]): number {
  const linear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("soft status contrast", () => {
  useKit();

  for (const theme of THEMES) {
    it.each(STATUS)(`%s text holds 4.5:1 on its tint in every state (${theme})`, (status) => {
      const root = mount(`<div data-ui="${theme}">
        <div data-surface="page" style="background-color: var(--color-background)"></div>
        <div data-surface="card" style="background-color: var(--color-card)"></div>
        <button data-ui="button" data-button-variant="${status}" type="button">b</button>
        <i data-probe></i>
      </div>`);
      const button = getComputedStyle(root.querySelector("button")!);
      const probe = root.querySelector<HTMLElement>("[data-probe]")!;
      // the privates hold the variant's color expressions; a probe in the same
      // theme scope resolves each one to a color
      const resolve = (property: string, as: "backgroundColor" | "color") => {
        probe.style[as] = button.getPropertyValue(property);
        return getComputedStyle(probe)[as];
      };
      for (const surface of root.querySelectorAll("[data-surface]")) {
        const under = style(surface, "background-color");
        for (const [state, [surfaceVar, textVar]] of Object.entries(STATES)) {
          const tint = resolve(surfaceVar, "backgroundColor");
          const ratio = contrast(
            composite(under, tint, resolve(textVar, "color")),
            composite(under, tint),
          );
          const where = `${(surface as HTMLElement).dataset.surface} ${state}`;
          expect(ratio, where).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
