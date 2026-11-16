"use strict";

/**
 * @fileoverview Carousel initialization and controls.
 * @description Discovers carousel roots (`<ui-carousel>` or `[data-ui~="carousel"]`),
 * starts the scroll-snap engine on each (base/carousel-scroll.ts), and wires
 * the page-level behaviors: arrow keys, dialog start index (subscribing to
 * `zazz:dialog-open` from base/dialog-lifecycle.ts; lightbox choreography
 * lives in lightbox.ts), and re-init after an in-page navigation.
 *
 * Structure: root is the element itself; parts are slots (`data-carousel-slot="<part>"`):
 * - root (`<ui-carousel>` | `[data-ui~="carousel"]`): Carousel container; holds all config attributes
 * - `viewport`: The scroll container (required)
 * - `container`: Slides flex track
 * - `slide`: Individual slide
 * - `prev` / `next`: Navigation buttons (optional)
 * - `dots` / `dot`: Dot pagination container and template dot (optional)
 * - `thumbs`: Linked thumb strip (optional), with its own viewport, container, and slides
 *
 * Configuration (on the carousel root):
 * - `data-carousel-loop`: `"true"` wraps from the last slide to the first (needs three slides)
 * - `data-carousel-align`: `start` (default) | `center` | `end`
 * - `data-carousel-axis`: `x` (default) | `y`; a vertical viewport needs a block size
 * - `data-carousel-draggable`: `"false"` turns mouse dragging off (touch still scrolls)
 * - `data-carousel-drag-free`: `"true"` scrolls freely with momentum, no snapping
 * - `data-carousel-skip-snaps`: `"true"` lets a mouse flick pass several snaps
 * - `data-carousel-start-snap`: Index to start on
 * - `data-carousel-keyboard`: `"false"` leaves the arrow keys to native scrolling
 * - `data-carousel-plugins`: `autoplay` or `auto-scroll`
 * - `data-carousel-autoplay-*`: `delay` (ms, 4000), `stop-on-last-snap`
 * - `data-carousel-auto-scroll-*`: `speed` (px per 60 Hz frame, 2), `start-delay` (ms, 1000),
 *   `direction` (`forward` | `backward`)
 * - both plugins: `…-play-on-init` (`"false"` waits for `play()`), `…-stop-on-interaction`
 *   (`"false"` holds during a drag, a scroll, or slide focus and resumes after; Prev/Next,
 *   the dots, the thumbs, and the arrow keys restart the delay; by default any of those
 *   stops it for good), `…-stop-on-mouse-enter`
 * - Right to left: no option; the track follows the inherited `dir`
 *
 * Thumb strip (on `data-carousel-slot="thumbs"`):
 * - `data-carousel-thumbs-*`: the options above for the strip (default: drag-free)
 *
 * Lifecycle and dialog start index:
 * - `data-carousel-init`: Set by script when a carousel is initialized
 * - `data-carousel-start`: On a trigger; slide index to open to (pairs with commandfor)
 * - `data-carousel-start-index`: Set on root by script; consumed when dialog opens
 *
 * State (`data-carousel-state` tokens, set by script): `snapped` and `in-view` on slides,
 * `active` on the current dot and thumb, `dragging` on the viewport during a mouse drag,
 * `playing` on the root while autoplay or auto-scroll is on. The root dispatches
 * `zazz:carousel-select` (`detail.index`) when the current snap changes.
 *
 * @example
 * data-carousel-loop="true"
 *
 * @example
 * data-carousel-align="center"
 *
 * @example
 * data-carousel-plugins="autoplay" data-carousel-autoplay-delay="3000"
 *
 * @example
 * data-carousel-plugins="auto-scroll" data-carousel-auto-scroll-speed="2"
 *
 * @example Barebones carousel (4 text slides; auto-inits on DOMContentLoaded):
 * <div data-ui="carousel">
 *   <div data-carousel-slot="viewport">
 *     <div data-carousel-slot="container">
 *       <div data-carousel-slot="slide">Slide 1</div>
 *       <div data-carousel-slot="slide">Slide 2</div>
 *       <div data-carousel-slot="slide">Slide 3</div>
 *       <div data-carousel-slot="slide">Slide 4</div>
 *     </div>
 *   </div>
 *   <button type="button" data-carousel-slot="prev">Prev</button>
 *   <button type="button" data-carousel-slot="next">Next</button>
 * </div>
 */

import { createCarousel, linkThumbs } from "./carousel-scroll.ts";
import { registerRefresh } from "./zazz-element.ts";

/** Carousel roots, in tag and attribute form. */
const ROOT = ':is(ui-carousel, [data-ui~="carousel"])';

// --- Carousel initialization ---

/**
 * @description Initializes a single carousel root: starts the engine from its
 * `data-carousel-*` attributes, links a thumb strip when it has one, and
 * stores the API on `root._carousel`. Idempotent: skips roots that are already
 * initialized, inside a closed dialog (no measurable viewport until open), or
 * that are another carousel's thumb strip (its owner runs it).
 *
 * Called by `initCarousels()` for attribute-form markup and by the
 * `<ui-carousel>` web component on connect.
 *
 * @param root - The carousel root element.
 */
function initCarouselRoot(root: Element): void {
  if (root.hasAttribute("data-carousel-init")) return;
  if (root.closest("dialog:not([open])")) return;
  if (root.matches('[data-carousel-slot~="thumbs"]')) return;

  const thumbsNode = root.querySelector('[data-carousel-slot~="thumbs"]');
  const viewport = root.querySelector<HTMLElement>(
    thumbsNode
      ? '[data-carousel-slot~="viewport"]:not([data-carousel-slot~="thumbs"] *)'
      : '[data-carousel-slot~="viewport"]',
  );
  if (!viewport) return;

  root.setAttribute("data-carousel-init", "");
  // a scroll container is keyboard-focusable in some engines only; make it so in all
  if (!viewport.hasAttribute("tabindex")) viewport.setAttribute("tabindex", "0");

  // One controller per root scopes everything the engine binds; the owner
  // (`<ui-carousel>` disconnectedCallback) aborts it on teardown.
  const controller = new AbortController();
  root._carouselController = controller;
  const api = createCarousel(root, viewport, controller.signal);
  if (api && thumbsNode) linkThumbs(api, root, thumbsNode, controller.signal);
}

/**
 * @description Initializes all carousels within a scope. Roots managed by the
 * `<ui-carousel>` web component are skipped: they initialize themselves on
 * connect.
 *
 * @param scope - Root element to search within. Defaults to `document`.
 */
function initCarousels(scope?: Document | Element): void {
  for (const root of (scope ?? document).querySelectorAll(ROOT)) {
    if (root.closest("ui-carousel")) continue;
    initCarouselRoot(root);
  }
}

// --- Dialog open subscription ---

/**
 * @description Reacts to dialogs opening (via `zazz:dialog-open` from
 * base/dialog-lifecycle.ts): initializes attribute-form roots that deferred
 * while the dialog was `display: none`, applies a stored
 * `data-carousel-start-index`, and focuses the viewport for keyboard
 * navigation.
 *
 * Listens on `document`, so it runs after any dialog- or ancestor-level
 * subscriber (`<ui-carousel>` self-init, `<ui-lightbox>` choreography).
 * @private
 */
function initDialogOpenSubscription(): void {
  document.addEventListener("zazz:dialog-open", (event) => {
    if (!(event.target instanceof HTMLDialogElement)) return;
    const dialog = event.target;
    initCarousels(dialog);

    for (const root of dialog.querySelectorAll(ROOT)) {
      const startIndex = root.getAttribute("data-carousel-start-index");
      if (startIndex != null && root._carousel) {
        root._carousel.goTo(Number(startIndex), true);
        root.removeAttribute("data-carousel-start-index");
      }
      const viewport = root.querySelector('[data-carousel-slot~="viewport"]');
      if (viewport instanceof HTMLElement) viewport.focus({ preventScroll: true });
    }
  });
}

// --- Keyboard navigation ---

/**
 * @description The carousel the arrow keys drive: one inside an open dialog,
 * else the one containing focus. Respects `data-carousel-keyboard="false"`.
 * @private
 */
function activeRoot(): Element | null {
  const usable = (root: Element | null | undefined): root is Element =>
    !!root?._carousel && root.getAttribute("data-carousel-keyboard") !== "false";

  const dialogRoot = document
    .querySelector("dialog[open]")
    ?.querySelector(`${ROOT}[data-carousel-init]`);
  if (usable(dialogRoot)) return dialogRoot;

  const focusedRoot = document.activeElement?.closest(`${ROOT}[data-carousel-init]`);
  return usable(focusedRoot) ? focusedRoot : null;
}

/**
 * @description Steps the active carousel on its axis's arrow keys: Left and
 * Right (mirrored in RTL), or Up and Down on a vertical track. Native arrow
 * scrolling would stop at the ends of a looped track and ignore the pending
 * step; keys off the axis are left alone.
 * @private
 */
function initKeyboardNav(): void {
  document.addEventListener("keydown", (event) => {
    if (!event.key.startsWith("Arrow") || event.defaultPrevented) return;
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      return;
    }

    const api = activeRoot()?._carousel;
    if (!api) return;
    const [back, forward] = api.vertical
      ? ["ArrowUp", "ArrowDown"]
      : api.rtl
        ? ["ArrowRight", "ArrowLeft"]
        : ["ArrowLeft", "ArrowRight"];
    if (event.key !== back && event.key !== forward) return;

    event.preventDefault();
    api.interact();
    if (event.key === back) api.goToPrev();
    else api.goToNext();
  });
}

// --- Start index control ---

/**
 * @description Stores or applies a start slide index from `[data-carousel-start]` triggers.
 *
 * Clicking an element with `data-carousel-start="N"` stores that index on the
 * target carousel (found via `commandfor` → dialog → carousel root); a slide
 * with `commandfor` opens the dialog at the carousel's current slide. The
 * dialog-open subscription scrolls to it on open.
 * @private
 */
function initStartLinks(): void {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    const trigger = event.target.closest(
      "[data-carousel-start], [data-carousel-slot~='slide'][commandfor]",
    );
    if (!trigger) return;

    let index = trigger.getAttribute("data-carousel-start");
    if (index == null) {
      const source = trigger.closest(ROOT)?._carousel;
      if (source) index = String(source.selectedSnap());
    }

    const dialogId = trigger.getAttribute("commandfor");
    const root = dialogId ? document.getElementById(dialogId)?.querySelector(ROOT) : null;
    if (!root || index == null) return;

    if (root._carousel) root._carousel.goTo(Number(index), true);
    else root.setAttribute("data-carousel-start-index", index);
  });
}

/**
 * @namespace Carousel
 * @description Public API for carousel initialization.
 *
 * @property init - Initializes all carousels within a scope.
 * @property initRoot - Initializes a single carousel root (used by `<ui-carousel>`).
 */
const Carousel = {
  init: initCarousels,
  initRoot: initCarouselRoot,
};

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // After an in-page navigation swap, initialize attribute-form carousels in
  // the new content (<ui-carousel> elements ride the swap via their own
  // lifecycle; init() skips already-initialized roots and closed dialogs).
  registerRefresh((scope) => initCarousels(scope));

  const start = () => {
    initCarousels();
    initDialogOpenSubscription();
    initStartLinks();
    initKeyboardNav();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // The documented public API (`window.Carousel`); also exported for module consumers.
  window.Carousel = Carousel;
}

export { Carousel };
