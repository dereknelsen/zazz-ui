/// <reference types="vite/client" />
"use strict";

/**
 * @fileoverview Browser-test harness. Lives outside src/ so tsc never emits
 * it into the published tree. Tests run in a
 * real engine (Vitest browser mode), so `getComputedStyle` is the truth.
 *
 * Kit CSS is injected as the raw published bytes (`?raw`), never through the
 * Vite CSS pipeline, so lightningcss cannot rewrite the mechanisms under test
 * (`@property`, `@container style()`, `light-dark()`, `oklch(from …)`).
 */

import { afterAll, beforeAll } from "vite-plus/test";
import { page, server, userEvent } from "vite-plus/test/browser/context";
import { BREAKPOINT_CH, type Breakpoint } from "../src/base/utilities.ts";

const cssFiles = import.meta.glob("../src/**/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function srcFile(path: string): string {
  const text = cssFiles[`../src/${path}`];
  if (text === undefined) throw new Error(`useKit: no such kit file src/${path}`);
  return text;
}

/** The kit's stylesheets in `index.css` @import order, as `src/`-relative paths. */
export const KIT_FILES: readonly string[] = [
  ...srcFile("index.css").matchAll(/^@import "\.\/([^"]+)";/gm),
].map((m) => m[1]);

/** Injects CSS text for the lifetime of the enclosing describe block. */
export function useCss(text: string): void {
  let sheet: HTMLStyleElement | undefined;
  beforeAll(() => {
    sheet = document.createElement("style");
    sheet.textContent = text;
    document.head.append(sheet);
  });
  afterAll(() => {
    sheet?.remove();
  });
}

/** The given kit files (default: the whole kit) as one CSS text, in `index.css` order. */
export function kitCss(files: readonly string[] = KIT_FILES): string {
  return files.map(srcFile).join("\n");
}

/** Injects the given kit files (default: the whole kit) in `index.css` order. */
export function useKit(files: readonly string[] = KIT_FILES): void {
  useCss(kitCss(files));
}

const fragmentFiles = import.meta.glob("../src/primitives/*/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Every primitive's example fragment, concatenated: a large, varied page of real kit markup. */
export function allFragments(): string {
  return Object.keys(fragmentFiles)
    .sort()
    .map((path) => `<section>${fragmentFiles[path]}</section>`)
    .join("\n");
}

/** Replaces the body with `html` and returns its first element. */
export function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.firstElementChild;
  if (!(el instanceof HTMLElement)) throw new Error("mount: html has no root element");
  return el;
}

/** Computed value of `property` on `el` (or on its pseudo-element). */
export function style(el: Element, property: string, pseudo?: "::before" | "::after"): string {
  return getComputedStyle(el, pseudo).getPropertyValue(property);
}

/** Waits for every running animation and transition on `el` to finish, then a frame. */
export async function settled(el: Element): Promise<void> {
  await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {})));
  await frame();
}

/**
 * Keyboard focus on `el` with `:focus-visible` matching and its transitions settled.
 * Tab reaches it in Chromium and Firefox; WebKit skips buttons on Tab (the macOS
 * "Tab to all controls" default), where a focus() after the key press still counts
 * as keyboard focus.
 */
export async function tabTo(el: HTMLElement): Promise<void> {
  await userEvent.tab();
  if (document.activeElement !== el) {
    if (server.browser !== "webkit") throw new Error("tabTo: Tab did not reach the element");
    el.focus();
  }
  await settled(el);
}

/** Two animation frames: enough for a viewport change or pointer event to settle. */
export async function frame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Resizes the test viewport (the page container) to `width` CSS pixels. */
export async function atWidth(width: number): Promise<void> {
  await page.viewport(width, 800);
  await frame();
}

/**
 * A breakpoint in px for the page: its ch count measured in body's font, which
 * is what the page containers (body, sectioning elements) resolve ch against.
 */
export function breakpointPx(bp: Breakpoint): number {
  const ruler = document.createElement("div");
  ruler.style.cssText = `position: absolute; inline-size: ${BREAKPOINT_CH[bp]}ch`;
  document.body.append(ruler);
  const px = ruler.getBoundingClientRect().width;
  ruler.remove();
  return px;
}

/** A viewport width just below a breakpoint. */
export const below = (bp: Breakpoint): number => Math.floor(breakpointPx(bp)) - 1;

/** A viewport width at (just past) a breakpoint. */
export const at = (bp: Breakpoint): number => Math.ceil(breakpointPx(bp)) + 1;

/** Pixels of `n × --spacing` (the scale unit is a fluid clamp), measured with a probe. */
export function scale(n: number): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position: absolute; inline-size: calc(${n} * var(--spacing));`;
  document.body.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}

/** Pixels of a CSS length expression, measured with a probe. */
export function lengthPx(expression: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position: absolute; inline-size: ${expression};`;
  document.body.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}
