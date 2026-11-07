"use strict";

/**
 * @fileoverview Buttons and badges share one state model: each variant resolves to the
 * same surface, text, and border at rest, hover, and active, in light and dark, and
 * every step is one a reader can see. Disabled looks the same on both.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../../test/browser.ts";

const VARIANTS = [
  "default",
  "outline",
  "primary",
  "secondary",
  "tertiary",
  "muted",
  "ghost",
  "info",
  "success",
  "warning",
  "destructive",
  "link",
] as const;
const THEMES = ["light", "dark"] as const;
const STATES = ["", "--hover", "--active"] as const;

const canvas = document.createElement("canvas");
canvas.width = canvas.height = 1;
const paint = canvas.getContext("2d", { willReadFrequently: true })!;

type Pixel = [number, number, number];

/** The sRGB pixel left by painting `layers` in order, each over the last. */
function composite(...layers: string[]): Pixel {
  paint.clearRect(0, 0, 1, 1);
  for (const layer of layers) {
    paint.fillStyle = "#000";
    paint.fillStyle = layer;
    paint.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
  return [r!, g!, b!];
}

/** The largest channel difference between two pixels. */
const distance = (a: Pixel, b: Pixel) =>
  Math.max(...a.map((channel, i) => Math.abs(channel - b[i]!)));

/** A computed color's alpha, 1 when it has none. */
const alpha = (color: string) => Number(/\/ ([\d.]+)\)/.exec(color)?.[1] ?? 1);

function luminance(pixel: Pixel): number {
  const [r, g, b] = pixel.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Pixel;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Pixel, b: Pixel): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** A variant's button and badge, and a resolver for their state colors. */
function mountPair(theme: string, variant: string) {
  const attr = (name: string) => (variant === "default" ? "" : `data-${name}-variant="${variant}"`);
  const root = mount(`<div data-theme="${theme}">
    <i data-page style="background-color: var(--color-background)"></i>
    <button data-ui="button" ${attr("button")} type="button">b</button>
    <button data-ui="badge" ${attr("badge")} type="button">b</button>
    <i data-probe></i>
  </div>`);
  const probe = root.querySelector<HTMLElement>("[data-probe]")!;
  const resolve = (name: "button" | "badge", utility: string) => {
    const element = root.querySelector(`[data-ui="${name}"]`)!;
    const own = getComputedStyle(element).getPropertyValue(`--_${name}-${utility}`);
    probe.style.backgroundColor = own.trim() || `var(--ui-${name}-${utility})`;
    return getComputedStyle(probe).backgroundColor;
  };
  const shadow = (name: "button" | "badge") =>
    getComputedStyle(root.querySelector(`[data-ui="${name}"]`)!).getPropertyValue(
      `--_${name}-shadow`,
    );
  return { page: style(root.querySelector("[data-page]")!, "background-color"), resolve, shadow };
}

describe("button and badge states", () => {
  useKit();

  for (const theme of THEMES) {
    it.each(VARIANTS)(`%s resolves the same on both in every state (${theme})`, (variant) => {
      const { resolve, shadow } = mountPair(theme, variant);
      expect(shadow("badge"), "shadow").toBe(shadow("button"));
      for (const state of STATES) {
        for (const utility of [`bg${state}`, `text${state}`, `border-color${state}`]) {
          expect(resolve("badge", utility), utility).toBe(resolve("button", utility));
        }
      }
    });

    it.each(VARIANTS.filter((variant) => variant !== "link"))(
      `%s moves a visible step at hover and again at active (${theme})`,
      (variant) => {
        const { page, resolve } = mountPair(theme, variant);
        const [rest, hover, active] = STATES.map((state) =>
          composite(page, resolve("button", `bg${state}`)),
        ) as [Pixel, Pixel, Pixel];
        expect(distance(hover, rest), "hover").toBeGreaterThanOrEqual(3);
        expect(distance(active, hover), "active").toBeGreaterThanOrEqual(3);
        expect(distance(active, rest), "active goes further").toBeGreaterThan(
          distance(hover, rest),
        );
      },
    );

    it.each(["default", "outline", "ghost"])(`%s gains the muted role (${theme})`, (variant) => {
      const { resolve } = mountPair(theme, variant);
      expect(alpha(resolve("button", "bg--active"))).toBeCloseTo(
        alpha(resolve("button", "bg--hover")) * 1.5,
        3,
      );
    });

    it(`muted fades toward the surface beneath (${theme})`, () => {
      const { resolve } = mountPair(theme, "muted");
      const [rest, hover, active] = STATES.map((state) => alpha(resolve("button", `bg${state}`)));
      expect(hover!).toBeLessThan(rest!);
      expect(active!).toBeLessThan(hover!);
    });

    it.each(["--hover", "--active"])(`link text holds 4.5:1 at %s (${theme})`, (state) => {
      const { page, resolve } = mountPair(theme, "link");
      const ratio = contrast(composite(page, resolve("button", `text${state}`)), composite(page));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  it.each(VARIANTS)("disables a %s badge the way it disables a button", (variant) => {
    const attr = (name: string) =>
      variant === "default" ? "" : `data-${name}-variant="${variant}"`;
    const root = mount(`<div>
      <button data-ui="button" ${attr("button")} disabled type="button">b</button>
      <button data-ui="badge" ${attr("badge")} disabled type="button">b</button>
    </div>`);
    const button = root.querySelector('[data-ui="button"]')!;
    const badge = root.querySelector('[data-ui="badge"]')!;
    for (const property of ["opacity", "color", "background-color", "cursor"]) {
      expect(style(badge, property), property).toBe(style(button, property));
    }
  });

  it("an outline badge is see-through at rest and keeps its border", () => {
    const root = mount(`<a href="#x" data-ui="badge" data-badge-variant="outline">b</a>`);
    expect(style(root, "background-color")).toBe("rgba(0, 0, 0, 0)");
    expect(style(root, "border-block-start-width")).toBe("1px");
    expect(style(root, "border-block-start-color")).not.toBe("rgba(0, 0, 0, 0)");
  });
});
