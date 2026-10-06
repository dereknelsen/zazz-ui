"use strict";

/**
 * @fileoverview Scroll-state polyfill for the `stuck` utility state.
 * @description Where container scroll-state queries are unsupported (Safari and
 * Firefox today), reproduces `scroll-state(stuck: <side>)` for the containers
 * `_utilities-tier-stuck.css` reads: every sticky element (a `style` holding
 * `: sticky`) or `--stuck-state` element that holds a `--<utility>--stuck`
 * reader. It writes the sides each one is stuck to, physical and logical, to the
 * container's `data-ui-stuck`, which the same CSS gates read, so markup does not
 * change: `--position: sticky; --top: 0; --stuck-state: top` around a
 * `--bg--stuck: …` descendant.
 *
 * Geometry, not sentinels (an extra element would take a grid cell or a flex
 * gap): on scroll and resize, once per frame, a container is stuck to a side
 * when it sits at that side's sticky offset in its scroll root and the root has
 * scrolled away from that side's start, so an element merely resting at its
 * offset (a header at the top of an unscrolled page) is not stuck. It reads as
 * unstuck once its containing block starts pushing it out, slightly before the
 * native query does.
 *
 * `index.ts` imports this module only where `scroll-state` is unsupported, so
 * Chromium never loads it; `start()` also refuses to run there.
 */

import { registerRefresh } from "./zazz-element.ts";

// --- Containers ---

type Side = "top" | "right" | "bottom" | "left";

/** The attribute `STUCK_STATE.polyfill` names in `base/utilities.ts`. */
const ATTRIBUTE = "data-ui-stuck";
/** `STUCK_STATE`'s containers, holding a reader. */
const CONTAINERS = '[style*=": sticky"], [style*="--stuck-state:"]';
const READER = '[style*="--stuck:"]';
const OPPOSITE: Record<Side, Side> = { top: "bottom", right: "left", bottom: "top", left: "right" };

let tracked: HTMLElement[] = [];
let controller: AbortController | undefined;
let frame = 0;

/** @description The nearest scrolling ancestor, or null for the viewport. @private */
function scrollRoot(el: Element): Element | null {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (/auto|scroll|hidden/.test(overflowX + overflowY)) return node;
  }
  return null;
}

/**
 * @description The logical sides a physical side also answers to, for the
 * container's own writing mode and direction (`block-start` is `top` in horizontal-tb).
 * @private
 */
function logicalNames(side: Side, { writingMode, direction }: CSSStyleDeclaration): string[] {
  const vertical = !writingMode.startsWith("horizontal");
  const blockStart: Side = vertical ? (writingMode.endsWith("lr") ? "left" : "right") : "top";
  const inlineStart: Side = vertical
    ? direction === "rtl"
      ? "bottom"
      : "top"
    : direction === "rtl"
      ? "right"
      : "left";
  const names: string[] = [];
  if (side === blockStart) names.push("block-start");
  if (side === OPPOSITE[blockStart]) names.push("block-end");
  if (side === inlineStart) names.push("inline-start");
  if (side === OPPOSITE[inlineStart]) names.push("inline-end");
  return names;
}

/** @description The sides `el` is stuck to right now. @private */
function stuckSides(el: HTMLElement, style: CSSStyleDeclaration): Side[] {
  if (style.position !== "sticky") return [];
  const root = scrollRoot(el);
  const scroller = root ?? document.scrollingElement ?? document.documentElement;
  // the root's scrollport, in viewport coordinates
  const port = root
    ? (() => {
        const r = root.getBoundingClientRect();
        const top = r.top + root.clientTop;
        const left = r.left + root.clientLeft;
        return { top, left, bottom: top + root.clientHeight, right: left + root.clientWidth };
      })()
    : { top: 0, left: 0, bottom: innerHeight, right: innerWidth };
  const rect = el.getBoundingClientRect();
  const maxTop = scroller.scrollHeight - scroller.clientHeight;
  const maxLeft = scroller.scrollWidth - scroller.clientWidth;
  // scrollLeft runs 0 → -max in rtl
  const rtl = getComputedStyle(scroller).direction === "rtl";
  const x = scroller.scrollLeft;
  const scrolledFrom: Record<Side, boolean> = {
    top: scroller.scrollTop > 0,
    bottom: scroller.scrollTop < maxTop - 0.5,
    left: rtl ? x > -maxLeft + 0.5 : x > 0,
    right: rtl ? x < 0 : x < maxLeft - 0.5,
  };
  const at: Record<Side, number> = {
    top: rect.top - port.top,
    bottom: port.bottom - rect.bottom,
    left: rect.left - port.left,
    right: port.right - rect.right,
  };
  return (Object.keys(at) as Side[]).filter((side) => {
    const offset = style[side];
    return (
      offset !== "auto" && scrolledFrom[side] && Math.abs(at[side] - Number.parseFloat(offset)) < 1
    );
  });
}

/** @description Writes each container's stuck sides to its `data-ui-stuck`. @private */
function write(): void {
  frame = 0;
  for (const el of tracked) {
    const style = getComputedStyle(el);
    const value = stuckSides(el, style)
      .flatMap((side) => [side, ...logicalNames(side, style)])
      .join(" ");
    if (value) {
      if (el.getAttribute(ATTRIBUTE) !== value) el.setAttribute(ATTRIBUTE, value);
    } else {
      el.removeAttribute(ATTRIBUTE);
    }
  }
}

function schedule(): void {
  frame ||= requestAnimationFrame(write);
}

/** @description (Re)collects the containers holding a reader, e.g. after a navigation swap. @private */
function scan(): void {
  if (!controller) return;
  for (const el of tracked) if (!el.isConnected) el.removeAttribute(ATTRIBUTE);
  tracked = [...document.querySelectorAll<HTMLElement>(CONTAINERS)].filter((el) =>
    el.querySelector(READER),
  );
  schedule();
}

// --- Public API ---

/** True where the browser evaluates container scroll-state queries itself. */
function isSupported(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("container-type", "scroll-state");
}

/**
 * @description Starts the polyfill; idempotent, and a no-op where `scroll-state`
 * is supported unless `force` is set (tests).
 */
function start({ force = false }: { force?: boolean } = {}): void {
  if (controller || (!force && isSupported())) return;
  controller = new AbortController();
  const options = { passive: true, capture: true, signal: controller.signal };
  // capture: scroll does not bubble, and nested scrollers count too
  document.addEventListener("scroll", schedule, options);
  window.addEventListener("resize", schedule, options);
  scan();
}

/** @description Stops the polyfill and clears every `data-ui-stuck` it wrote. */
function stop(): void {
  controller?.abort();
  controller = undefined;
  cancelAnimationFrame(frame);
  frame = 0;
  for (const el of tracked) el.removeAttribute(ATTRIBUTE);
  tracked = [];
}

const ScrollState = { start, stop, isSupported, refresh: scan };

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => start(), { once: true });
  } else {
    start();
  }
  // a navigation swap brings new containers
  registerRefresh(scan);
}

export { ScrollState };
