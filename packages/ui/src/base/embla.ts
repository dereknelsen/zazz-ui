"use strict";

/**
 * @fileoverview Embla Carousel initialization and controls.
 * @description Discovers carousel roots (`<ui-carousel>` or `.ui-carousel`),
 * initializes Embla instances with optional plugins, and wires navigation,
 * keyboard, and dialog-open behaviors (subscribing to `zazz:dialog-open`
 * from base/dialog-lifecycle.ts — lightbox choreography lives in lightbox.ts).
 *
 * Structure — root is the element/class itself; parts are slots (`data-slot="carousel-<part>"`):
 * - root (`<ui-carousel>` | `.ui-carousel`) — Carousel container; holds all config attributes
 * - `carousel-viewport` — Visible window (required)
 * - `carousel-container` — Slides flex track
 * - `carousel-slide` — Individual slide
 * - `carousel-prev` / `carousel-next` — Navigation buttons (optional)
 * - `carousel-dots` / `carousel-dot` — Dot pagination container and template dot (optional)
 * - `carousel-thumbs` — Linked thumb carousel container (optional)
 *
 * thumb navigation (on `data-slot="carousel-thumbs"`):
 * - `data-carousel-thumbs-*` — thumb carousel options (defaults: containScroll keepSnaps, dragFree true)
 * - Syncs with the main carousel in the same root
 *
 * Lifecycle and dialog start index:
 * - `data-carousel-init` — Set by script when a carousel is initialized
 * - `data-carousel-start` — On a trigger; slide index to open to (pairs with commandfor)
 * - `data-carousel-start-index` — Set on root by script; consumed when dialog opens
 * - `data-carousel-keyboard` — Set to `"false"` to disable ArrowLeft/ArrowRight navigation
 *
 * Configuration (on the carousel root: `<ui-carousel>` or `.ui-carousel`):
 * - `data-carousel-*` — Core Embla options
 * - `data-carousel-autoplay` / `data-carousel-autoplay-*` — Autoplay plugin
 * - `data-carousel-autoscroll` / `data-carousel-autoscroll-*` — Auto scroll plugin
 * - `data-carousel-classnames` / `data-carousel-classnames-*` — Class names plugin
 *
 * @see https://www.embla-carousel.com/docs/api/options#reference
 * @see https://www.embla-carousel.com/docs/plugins/autoplay#options
 * @see https://www.embla-carousel.com/docs/plugins/auto-scroll#options
 * @see https://www.embla-carousel.com/docs/plugins/class-names#options
 * @see https://www.embla-carousel.com/docs/plugins/ssr#options
 *
 * @example
 * data-carousel-loop="true"
 *
 * @example
 * data-carousel-align="start"
 *
 * @example
 * data-carousel-autoplay data-carousel-autoplay-delay="3000"
 *
 * @example
 * data-carousel-autoscroll data-carousel-autoscroll-speed="2"
 *
 * @example
 * data-carousel-classnames data-carousel-classnames-snapped="is-snapped"
 *
 * @example Barebones carousel (4 text slides; auto-inits on DOMContentLoaded):
 * <div class="ui-carousel">
 *   <div data-slot="carousel-viewport">
 *     <div data-slot="carousel-container">
 *       <div data-slot="carousel-slide">Slide 1</div>
 *       <div data-slot="carousel-slide">Slide 2</div>
 *       <div data-slot="carousel-slide">Slide 3</div>
 *       <div data-slot="carousel-slide">Slide 4</div>
 *     </div>
 *   </div>
 *   <button type="button" data-slot="carousel-prev">Prev</button>
 *   <button type="button" data-slot="carousel-next">Next</button>
 * </div>
 */

import { Utils } from "./utils.ts";
import { registerRefresh } from "./zazz-element.ts";

// Embla ships as real ES modules: bare specifiers resolve through the page's
// import map in browsers (pinned jsDelivr URLs — see `head.ts`) and through
// node_modules in tests/bundlers. No more UMD globals, no tag-order contract.
import EmblaCarousel from "embla-carousel";
import type { EmblaOptionsType } from "embla-carousel";
import EmblaCarouselAutoplay from "embla-carousel-autoplay";
import type { AutoplayOptionsType } from "embla-carousel-autoplay";
import EmblaCarouselAutoScroll from "embla-carousel-auto-scroll";
import type { AutoScrollOptionsType } from "embla-carousel-auto-scroll";
import EmblaCarouselClassNames from "embla-carousel-class-names";
import type { ClassNamesOptionsType } from "embla-carousel-class-names";

// --- Active-index sync ---

/**
 * @description Toggles `.is-active` on the node at `selected` and clears it
 * from every other node — the shared "which one is current" marker used by
 * both dot pagination and thumb navigation.
 *
 * @param nodes - Candidate nodes, in slide order.
 * @param selected - The active index.
 * @param options - Set `ariaCurrent` to also toggle `aria-current` (thumb
 * navigation exposes the active thumb to assistive tech; dots don't need it —
 * their `.is-active` state is purely visual pagination).
 * @private
 */
function setActiveIndex(
  nodes: readonly HTMLElement[],
  selected: number,
  options: { ariaCurrent?: boolean } = {},
): void {
  nodes.forEach((node, idx) => {
    const active = idx === selected;
    node.classList.toggle("is-active", active);
    if (!options.ariaCurrent) return;
    if (active) {
      node.setAttribute("aria-current", "true");
    } else {
      node.removeAttribute("aria-current");
    }
  });
}

// --- Dot navigation ---

/**
 * @description Adds dot navigation buttons and click handlers for an Embla carousel.
 *
 * @param emblaApi - The Embla carousel API instance.
 * @param dotsNode - Container element for dot navigation.
 * @param signal - Aborts the dot click listeners on teardown.
 * @returns Cleanup function to remove dots.
 */
const addDotBtnsAndClickHandlers = (
  emblaApi: EmblaCarouselType,
  dotsNode: Element,
  signal?: AbortSignal,
): (() => void) | undefined => {
  if (!dotsNode) return;

  const templateDot = dotsNode.querySelector('[data-slot~="carousel-dot"]');
  if (!templateDot) return;

  let dotNodes: HTMLElement[] = [];

  /**
   * @description Creates dot buttons for each slide and binds click handlers.
   *
   * @private
   */
  const addDotBtnsWithClickHandlers = () => {
    const snapCount = emblaApi.scrollSnapList().length;

    dotsNode.innerHTML = "";

    if (snapCount <= 1) {
      dotNodes = [];
      return;
    }

    dotNodes = [];
    for (let i = 0; i < snapCount; i++) {
      const dot = templateDot.cloneNode(true) as HTMLElement;
      dotNodes.push(dot);
      dotsNode.appendChild(dot);

      dot.addEventListener("click", () => emblaApi.scrollTo(i), { signal });
    }
  };

  /**
   * @description Updates the active state of dot buttons based on the current slide.
   *
   * @private
   */
  const toggleDotBtnsActive = () => {
    if (!dotNodes.length) return;
    setActiveIndex(dotNodes, emblaApi.selectedScrollSnap());
  };

  emblaApi
    .on("init", addDotBtnsWithClickHandlers)
    .on("reInit", addDotBtnsWithClickHandlers)
    .on("init", toggleDotBtnsActive)
    .on("reInit", toggleDotBtnsActive)
    .on("select", toggleDotBtnsActive);

  return () => {
    dotsNode.innerHTML = "";
  };
};

// --- thumb navigation ---

/**
 * @description Adds click handlers on thumb slides to scroll the main carousel.
 *
 * @param emblaApiMain - Main carousel API instance.
 * @param emblaApiThumb - thumb carousel API instance.
 * @param signal - Aborts the thumb click listeners on teardown.
 */
const addThumbClickHandlers = (
  emblaApiMain: EmblaCarouselType,
  emblaApiThumb: EmblaCarouselType,
  signal?: AbortSignal,
) => {
  const slidesthumbs = emblaApiThumb.slideNodes();

  slidesthumbs.forEach((slideNode: HTMLElement, index: number) => {
    slideNode.addEventListener("click", () => emblaApiMain.scrollTo(index), { signal });
  });
};

/**
 * @description Keeps the thumb carousel and active state in sync with the main carousel.
 *
 * @param emblaApiMain - Main carousel API instance.
 * @param emblaApiThumb - thumb carousel API instance.
 */
const addTogglethumbsActive = (
  emblaApiMain: EmblaCarouselType,
  emblaApiThumb: EmblaCarouselType,
) => {
  const slidesthumbs = emblaApiThumb.slideNodes();

  /**
   * @description Scrolls thumbs to the selected snap and toggles active classes.
   *
   * @private
   */
  const toggleThumbBtnsActive = () => {
    const selected = emblaApiMain.selectedScrollSnap();
    emblaApiThumb.scrollTo(selected);
    setActiveIndex(slidesthumbs, selected, { ariaCurrent: true });
  };

  emblaApiMain.on("select", toggleThumbBtnsActive);
  toggleThumbBtnsActive();
};

// --- Drag-aware click suppression ---

/**
 * Deadline (ms, `performance.now()`) until which invoker `command` events are
 * cancelled because a carousel drag just ended. Set by bindDragClickSuppression
 * for command-bearing slides (the lightbox stage) and enforced by
 * initCommandDragGuard. A bare `click` guard is not enough: the native /
 * polyfilled invoker opens the dialog from its own `command` dispatch.
 */
let suppressCommandsUntil = 0;

/**
 * @description Suppresses click activation immediately after a drag gesture.
 *
 * This prevents click-style actions (invoker commands, thumb navigation clicks)
 * from firing when the intent was dragging the carousel.
 *
 * @param root - Embla root/subtree to monitor.
 * @param emblaApi - Carousel instance tied to this root.
 * @param clickSelector - Click targets to suppress after dragging.
 * @param options - Per-carousel drag tolerance.
 * @param signal - Aborts the pointer/click listeners on teardown.
 */
function bindDragClickSuppression(
  root: Element,
  emblaApi: EmblaCarouselType,
  clickSelector: string,
  options: { dragThresholdPx?: number } = {},
  signal?: AbortSignal,
): void {
  const DRAG_THRESHOLD_PX = options.dragThresholdPx ?? 6;
  const SUPPRESS_WINDOW_MS = 250;
  // Slides that open a dialog (command="show-modal") also need command suppression.
  const guardsCommands = clickSelector.includes("commandfor");

  let pointerDown = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let snapAtDown = 0;
  let suppressUntil = 0;

  const pointerDistance = (): number => Math.hypot(lastX - startX, lastY - startY);

  root.addEventListener(
    "pointerdown",
    (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      pointerDown = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      snapAtDown = emblaApi.selectedScrollSnap();
    },
    { passive: true, signal },
  );

  root.addEventListener(
    "pointermove",
    (e) => {
      if (!pointerDown || !(e instanceof PointerEvent)) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (moved) return;

      if (pointerDistance() >= DRAG_THRESHOLD_PX) moved = true;
    },
    { passive: true, signal },
  );

  const finalizePointer = () => {
    if (pointerDown && moved) {
      suppressUntil = performance.now() + SUPPRESS_WINDOW_MS;
      if (guardsCommands) suppressCommandsUntil = suppressUntil;
    }
    pointerDown = false;
    moved = false;
  };

  root.addEventListener("pointerup", finalizePointer, { passive: true, signal });
  root.addEventListener("pointercancel", finalizePointer, { passive: true, signal });
  emblaApi.on("pointerUp", finalizePointer);

  // Touch/trackpad drags can move with tiny deltas. Treat Embla scroll as drag intent,
  // but lightbox openers need extra tolerance so minor carousel settle does not block clicks.
  emblaApi.on("scroll", () => {
    if (!pointerDown) return;

    if (guardsCommands) {
      if (pointerDistance() >= DRAG_THRESHOLD_PX || emblaApi.selectedScrollSnap() !== snapAtDown) {
        moved = true;
      }
      return;
    }

    moved = true;
  });

  root.addEventListener(
    "click",
    (e) => {
      if (performance.now() > suppressUntil) return;

      const target = e.target instanceof Element ? e.target.closest(clickSelector) : null;
      if (!target || !root.contains(target)) return;

      e.preventDefault();
      e.stopImmediatePropagation();
    },
    { capture: true, signal },
  );
}

let commandDragGuardBound = false;

/**
 * @description Cancels invoker `command` events fired right after a carousel drag.
 *
 * Lightbox stage slides carry `command="show-modal"`, so a drag would both scroll
 * the carousel and open the dialog. The `command` event (native or polyfill) is
 * the single point that runs the built-in command, and it is cancelable — so we
 * preventDefault() it within the drag-suppress window. Bound once on `document` in
 * the capture phase; `command` does not bubble, but capture still reaches it.
 */
function initCommandDragGuard(): void {
  if (commandDragGuardBound) return;
  commandDragGuardBound = true;

  document.addEventListener(
    "command",
    (e) => {
      if (e.cancelable && performance.now() <= suppressCommandsUntil) e.preventDefault();
    },
    true,
  );
}

// --- Carousel initialization ---

/**
 * @description Initializes a single Embla carousel root.
 *
 * Configures the carousel from its `data-carousel-*` attributes, wires navigation
 * (prev/next, dots, thumbs), and stores the API on `root._emblaApi`. Idempotent:
 * skips roots that are already initialized or inside a closed dialog (no
 * measurable viewport until open).
 *
 * Called by `initEmblaCarousels()` for class-form (`.ui-carousel`) markup and by
 * the `<ui-carousel>` web component (zazz/scripts/carousel.js) on connect.
 *
 * @param emblaNode - The carousel root element.
 */
function initEmblaRoot(emblaNode: Element): void {
  if (emblaNode.hasAttribute("data-carousel-init")) return;

  // Defer init inside closed dialogs — viewport has no measurable size until open
  if (emblaNode.closest("dialog:not([open])")) return;

  emblaNode.setAttribute("data-carousel-init", "");

  const emblathumbsNode = emblaNode.querySelector('[data-slot~="carousel-thumbs"]');
  const emblaViewportNode = emblathumbsNode
    ? emblaNode.querySelector(
        '[data-slot~="carousel-viewport"]:not([data-slot~="carousel-thumbs"] *)',
      )
    : emblaNode.querySelector('[data-slot~="carousel-viewport"]');
  const emblaPrevButtonNode = emblaNode.querySelector('[data-slot~="carousel-prev"]');
  const emblaNextButtonNode = emblaNode.querySelector('[data-slot~="carousel-next"]');
  const emblaDotsNode = emblaNode.querySelector('[data-slot~="carousel-dots"]');

  if (!emblaViewportNode) return;

  if (!emblaViewportNode.hasAttribute("tabindex")) {
    emblaViewportNode.setAttribute("tabindex", "0");
  }

  const apiOptions = Utils.parseDataAttributes(emblaNode, "data-carousel-");

  // Keep plugin keys out of core Embla options
  Object.keys(apiOptions).forEach(function (key) {
    if (
      key === "name" ||
      key === "keyboard" ||
      key === "autoplay" ||
      key === "autoscroll" ||
      key === "classnames" ||
      key.startsWith("autoplay") ||
      key.startsWith("autoscroll") ||
      key.startsWith("classnames")
    ) {
      delete apiOptions[key];
    }
  });

  // Veto drag gestures when every slide already fits in the viewport — with a
  // single snap Embla still rubber-bands on drag, which feels broken. The
  // callback re-evaluates on every pointer down, so it stays correct across
  // resizes/reInit. Respect an explicit data-carousel-watch-drag override.
  // @see https://github.com/davidjerleke/embla-carousel/issues/416
  if (!("watchDrag" in apiOptions)) {
    apiOptions.watchDrag = (api: EmblaCarouselType) => api.canScrollPrev() || api.canScrollNext();
  }

  const autoplayOptions = Utils.parseDataAttributes(emblaNode, "data-carousel-autoplay-");
  const autoscrollOptions = Utils.parseDataAttributes(emblaNode, "data-carousel-autoscroll-");
  const classnamesOptions = Utils.parseDataAttributes(emblaNode, "data-carousel-classnames-");

  const plugins: EmblaPlugin[] = [];

  if (emblaNode.hasAttribute("data-carousel-autoplay") || Object.keys(autoplayOptions).length > 0) {
    plugins.push(EmblaCarouselAutoplay(autoplayOptions as AutoplayOptionsType));
  }

  if (
    emblaNode.hasAttribute("data-carousel-autoscroll") ||
    Object.keys(autoscrollOptions).length > 0
  ) {
    plugins.push(EmblaCarouselAutoScroll(autoscrollOptions as AutoScrollOptionsType));
  }

  if (
    emblaNode.hasAttribute("data-carousel-classnames") ||
    Object.keys(classnamesOptions).length > 0
  ) {
    plugins.push(EmblaCarouselClassNames(classnamesOptions as ClassNamesOptionsType));
  }

  // The options come from untyped data attributes; Embla validates at runtime.
  const emblaApi = EmblaCarousel(
    emblaViewportNode as HTMLElement,
    apiOptions as EmblaOptionsType,
    plugins,
  );

  emblaNode._emblaApi = emblaApi;

  // One controller per root scopes every carousel listener below; the owner
  // (`<ui-carousel>` disconnectedCallback) aborts it on teardown so the DOM
  // listeners are removed alongside the destroyed Embla instance.
  const controller = new AbortController();
  const { signal } = controller;
  emblaNode._emblaController = controller;

  if (emblaPrevButtonNode) {
    emblaPrevButtonNode.addEventListener("click", () => emblaApi.scrollPrev(), { signal });
  }

  if (emblaNextButtonNode) {
    emblaNextButtonNode.addEventListener("click", () => emblaApi.scrollNext(), { signal });
  }

  if (emblaDotsNode) {
    addDotBtnsAndClickHandlers(emblaApi, emblaDotsNode, signal);
  }

  // Any command-bearing slide (e.g. a lightbox stage slide that opens the
  // dialog) needs its click suppressed when it was really a drag.
  if (emblaNode.querySelector('[data-slot~="carousel-slide"][commandfor]')) {
    bindDragClickSuppression(
      emblaNode,
      emblaApi,
      '[data-slot~="carousel-slide"][commandfor]',
      { dragThresholdPx: 14 },
      signal,
    );
  }

  if (emblathumbsNode) {
    const emblathumbsViewportNode = emblathumbsNode.querySelector(
      '[data-slot~="carousel-viewport"]',
    );
    if (emblathumbsViewportNode) {
      const thumbDefaults = { containScroll: "keepSnaps", dragFree: true };
      const thumbOptions = Utils.parseDataAttributes(emblathumbsNode, "data-carousel-thumbs-");
      const emblaApiThumb = EmblaCarousel(
        emblathumbsViewportNode as HTMLElement,
        {
          ...thumbDefaults,
          ...thumbOptions,
        } as EmblaOptionsType,
      );

      emblaNode._emblaApiThumb = emblaApiThumb;
      addThumbClickHandlers(emblaApi, emblaApiThumb, signal);
      addTogglethumbsActive(emblaApi, emblaApiThumb);

      bindDragClickSuppression(
        emblathumbsNode,
        emblaApiThumb,
        '[data-slot~="carousel-slide"]',
        {},
        signal,
      );
    }
  }
}

/**
 * @description Initializes all Embla carousels within a scope.
 *
 * Discovers carousel elements via `:is(ui-carousel, .ui-carousel)` and configures them
 * based on their data attributes. Roots managed by the `<ui-carousel>` web
 * component are skipped — they initialize themselves via `connectedCallback()`.
 *
 * @param scope - Root element to search within. Defaults to `document`.
 */
function initEmblaCarousels(scope?: Document | Element): void {
  const root = scope || document;
  const emblaRoots = root.querySelectorAll(":is(ui-carousel, .ui-carousel)");

  emblaRoots.forEach(function (emblaNode) {
    // <ui-carousel> elements own their lifecycle (init on connect, destroy
    // on disconnect) — double-initializing would leak a second Embla instance.
    if (emblaNode.closest("ui-carousel")) return;

    initEmblaRoot(emblaNode);
  });
}

// --- Dialog open subscription ---

/**
 * @description Reacts to dialogs opening (via `zazz:dialog-open` from
 * base/dialog-lifecycle.ts — ADR-0003) with the carousel-domain work:
 * initializes class-form roots that deferred while the dialog was
 * `display: none`, applies a stored `data-carousel-start-index`, and focuses
 * the viewport for keyboard navigation.
 *
 * Listens on `document`, so it runs after any dialog- or ancestor-level
 * subscriber (`<ui-carousel>` self-init, `<ui-lightbox>` choreography).
 */
function initDialogOpenSubscription(): void {
  document.addEventListener("zazz:dialog-open", function (e) {
    if (!(e.target instanceof HTMLDialogElement)) return;
    const dialog = e.target;
    initEmblaCarousels(dialog);

    const roots = dialog.querySelectorAll(":is(ui-carousel, .ui-carousel)");
    roots.forEach(function (root) {
      const startIndex = root.getAttribute("data-carousel-start-index");
      if (startIndex != null && root._emblaApi) {
        root._emblaApi.scrollTo(Number(startIndex), true);
        root.removeAttribute("data-carousel-start-index");
      }

      const viewport = root.querySelector('[data-slot~="carousel-viewport"]');
      if (viewport instanceof HTMLElement) {
        viewport.focus({ preventScroll: true });
      }
    });
  });
}

// --- Keyboard navigation ---

/**
 * @description Returns the active Embla root for keyboard navigation.
 *
 * Prefers a carousel inside an open dialog, then the carousel containing focus.
 * Respects `data-carousel-keyboard="false"`.
 *
 * @returns The active carousel root, or null when none applies.
 * @private
 */
function getActiveEmblaRoot(): (Element & { _emblaApi: EmblaCarouselType }) | null {
  const openDialog = document.querySelector("dialog[open]");
  if (openDialog) {
    const dialogRoot = openDialog.querySelector(
      ":is(ui-carousel, .ui-carousel)[data-carousel-init]",
    );
    if (dialogRoot?._emblaApi && dialogRoot.getAttribute("data-carousel-keyboard") !== "false") {
      return dialogRoot as Element & { _emblaApi: EmblaCarouselType };
    }
  }

  const focusedRoot = document.activeElement?.closest(
    ":is(ui-carousel, .ui-carousel)[data-carousel-init]",
  );
  if (focusedRoot?._emblaApi && focusedRoot.getAttribute("data-carousel-keyboard") !== "false") {
    return focusedRoot as Element & { _emblaApi: EmblaCarouselType };
  }

  return null;
}

/**
 * @description Binds ArrowLeft/ArrowRight keyboard navigation for active carousels.
 *
 * Embla is headless — arrow keys are not built in. Opt out per carousel with
 * `data-carousel-keyboard="false"`.
 */
const initEmblaKeyboardNav: InitEmblaKeyboardNavFn = function () {
  if (initEmblaKeyboardNav._bound) return;
  initEmblaKeyboardNav._bound = true;

  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.defaultPrevented) return;

    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      return;
    }

    const root = getActiveEmblaRoot();
    if (!root) return;

    e.preventDefault();
    if (e.key === "ArrowLeft") root._emblaApi.scrollPrev();
    else root._emblaApi.scrollNext();
  });
};

/**
 * @namespace EmblaInit
 * @description Public API for Embla carousel initialization and helpers.
 *
 * @property init - Initializes all carousels within a scope.
 * @property initRoot - Initializes a single carousel root (used by `<ui-carousel>`).
 * @property addDotBtnsAndClickHandlers - Wires dot pagination.
 * @property addThumbClickHandlers - Wires thumb click handlers.
 * @property addTogglethumbsActive - Syncs thumb active state.
 */
const EmblaInit = {
  init: initEmblaCarousels,
  initRoot: initEmblaRoot,
  addDotBtnsAndClickHandlers,
  addThumbClickHandlers,
  addTogglethumbsActive,
};

// --- Start index control ---

/**
 * @description Stores or applies a start slide index from `[data-carousel-start]` triggers.
 *
 * Clicking an element with `data-carousel-start="N"` stores that index on the target
 * carousel (found via `commandfor` → dialog → `:is(ui-carousel, .ui-carousel)`). The dialog
 * open observer scrolls to it on open.
 */
function initEmblaStartLinks(): void {
  document.addEventListener("click", function (e) {
    if (!(e.target instanceof HTMLElement)) return;

    const trigger = e.target.closest(
      "[data-carousel-start], [data-slot~='carousel-slide'][commandfor]",
    );
    if (!trigger) return;

    let index = trigger.getAttribute("data-carousel-start");
    if (index == null && trigger.hasAttribute("commandfor")) {
      const emblaRoot = trigger.closest(":is(ui-carousel, .ui-carousel)");
      if (emblaRoot?._emblaApi) {
        index = String(emblaRoot._emblaApi.selectedScrollSnap());
      }
    }

    const dialogId = trigger.getAttribute("commandfor");
    if (!dialogId) return;

    const dialog = document.getElementById(dialogId);
    if (!dialog) return;

    const root = dialog.querySelector(":is(ui-carousel, .ui-carousel)");
    if (!root) return;

    if (root._emblaApi) {
      root._emblaApi.scrollTo(Number(index), true);
    } else if (index != null) {
      root.setAttribute("data-carousel-start-index", index);
    }
  });
}

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // After a SPA <main> swap, initialize class-form carousels in the new content
  // (<ui-carousel> elements ride the swap via their own lifecycle; init() skips
  // already-initialized roots and closed dialogs).
  registerRefresh((scope) => initEmblaCarousels(scope));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initEmblaCarousels();
      initDialogOpenSubscription();
      initEmblaStartLinks();
      initEmblaKeyboardNav();
      initCommandDragGuard();
    });
  } else {
    initEmblaCarousels();
    initDialogOpenSubscription();
    initEmblaStartLinks();
    initEmblaKeyboardNav();
    initCommandDragGuard();
  }
}

// Attach to window for the documented public API (`window.EmblaInit`), and export
// for module consumers (carousel.js / navigation.js import it via the main.js bundle).
if (typeof window !== "undefined") {
  window.EmblaInit = EmblaInit;
}

// setActiveIndex is exported for unit tests only — not part of the public API.
export { EmblaInit, setActiveIndex };
